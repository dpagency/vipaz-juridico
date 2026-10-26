-- Legal production workflow: versioned templates, approval gates and human review.
begin;

alter table public.document_templates drop constraint if exists document_templates_status_check;
alter table public.document_templates
  add column if not exists original_filename text,
  add column if not exists mime_type text default 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  add column if not exists composition_map jsonb not null default '{"schemaVersion":2,"bindings":[]}'::jsonb,
  add column if not exists schema_version integer not null default 2,
  add column if not exists checksum text,
  add column if not exists change_notes text,
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz;

update public.document_templates set status = 'approved' where status = 'active';
alter table public.document_templates
  add constraint document_templates_status_check
  check (status in ('draft', 'in_review', 'approved', 'deprecated', 'archived'));

create unique index if not exists document_templates_org_name_version_uidx
  on public.document_templates (organization_id, lower(name), version);

alter table public.generation_jobs
  add column if not exists template_id uuid references public.document_templates(id),
  add column if not exists template_version text;

alter table public.generated_documents
  add column if not exists template_id uuid references public.document_templates(id),
  add column if not exists template_version text,
  add column if not exists review_status text not null default 'draft',
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

alter table public.generated_documents drop constraint if exists generated_documents_review_status_check;
alter table public.generated_documents add constraint generated_documents_review_status_check
  check (review_status in ('draft', 'awaiting_review', 'changes_requested', 'approved', 'rejected'));

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generated_document_id uuid not null references public.generated_documents(id) on delete cascade,
  generation_job_id uuid not null references public.generation_jobs(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  status text not null check (status in ('awaiting_review', 'changes_requested', 'approved', 'rejected')),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists document_reviews_document_idx on public.document_reviews(generated_document_id, created_at desc);
alter table public.document_reviews enable row level security;
drop policy if exists document_reviews_select on public.document_reviews;
drop policy if exists document_reviews_insert on public.document_reviews;
create policy document_reviews_select on public.document_reviews for select to authenticated
  using (public.user_belongs_to_org(organization_id));
create policy document_reviews_insert on public.document_reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and public.user_has_org_role(organization_id, array['admin','senior_lawyer','lawyer','reviewer'])
  );

create or replace function public.record_document_review(
  p_organization_id uuid,
  p_document_id uuid,
  p_job_id uuid,
  p_status text,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_id uuid;
begin
  if p_status not in ('awaiting_review', 'changes_requested', 'approved', 'rejected') then
    raise exception 'Invalid review status';
  end if;
  if not public.user_has_org_role(p_organization_id, array['admin','senior_lawyer','lawyer','reviewer']) then
    raise exception 'Forbidden';
  end if;
  if not exists (
    select 1 from public.generated_documents
    where id = p_document_id and generation_job_id = p_job_id and organization_id = p_organization_id
  ) then
    raise exception 'Document not found in organization';
  end if;
  insert into public.document_reviews (organization_id, generated_document_id, generation_job_id, reviewer_id, status, notes)
  values (p_organization_id, p_document_id, p_job_id, auth.uid(), p_status, nullif(trim(p_notes), ''))
  returning id into v_review_id;
  update public.generated_documents set
    review_status = p_status,
    review_notes = nullif(trim(p_notes), ''),
    reviewed_by = case when p_status = 'awaiting_review' then null else auth.uid() end,
    reviewed_at = case when p_status = 'awaiting_review' then null else timezone('utc', now()) end,
    updated_at = timezone('utc', now())
  where id = p_document_id and organization_id = p_organization_id;
  return v_review_id;
end;
$$;
revoke all on function public.record_document_review(uuid, uuid, uuid, text, text) from public;
grant execute on function public.record_document_review(uuid, uuid, uuid, text, text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('document-templates', 'document-templates', false, 52428800,
      array['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
    on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    drop policy if exists document_templates_tenant_select on storage.objects;
    drop policy if exists document_templates_tenant_insert on storage.objects;
    drop policy if exists document_templates_tenant_update on storage.objects;
    create policy document_templates_tenant_select on storage.objects for select to authenticated
      using (bucket_id = 'document-templates' and public.user_belongs_to_org(public.storage_path_organization_id(name)));
    create policy document_templates_tenant_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'document-templates' and public.user_has_org_role(public.storage_path_organization_id(name), array['admin','senior_lawyer']));
    create policy document_templates_tenant_update on storage.objects for update to authenticated
      using (bucket_id = 'document-templates' and public.user_has_org_role(public.storage_path_organization_id(name), array['admin','senior_lawyer']))
      with check (bucket_id = 'document-templates' and public.user_has_org_role(public.storage_path_organization_id(name), array['admin','senior_lawyer']));
  end if;
end $$;

commit;
