-- VIPAZ Delivery: additive, tenant-scoped provenance records. No existing data modified.
create table if not exists public.vipaz_extracted_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  process_id uuid not null references public.processes(id),
  source_document_id uuid not null references public.source_documents(id),
  page_number integer not null check (page_number > 0),
  content text not null check (length(btrim(content)) > 0),
  extraction_method text not null default 'pdf_text',
  created_at timestamptz not null default now(),
  unique (source_document_id, page_number)
);
create index if not exists vipaz_extracted_pages_process_idx on public.vipaz_extracted_pages (organization_id, process_id);
create table if not exists public.vipaz_approved_theses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  title text not null check (length(btrim(title)) > 0),
  version text not null check (length(btrim(version)) > 0),
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id, version)
);
create index if not exists vipaz_approved_theses_status_idx on public.vipaz_approved_theses (organization_id,status);
alter table public.vipaz_extracted_pages enable row level security;
alter table public.vipaz_approved_theses enable row level security;
create policy vipaz_pages_read_member on public.vipaz_extracted_pages
  for select to authenticated using (
    exists (select 1 from public.organization_members m where m.organization_id=vipaz_extracted_pages.organization_id and m.user_id=auth.uid())
  );
create policy vipaz_theses_read_member on public.vipaz_approved_theses
  for select to authenticated using (
    status='approved' and exists (select 1 from public.organization_members m where m.organization_id=vipaz_approved_theses.organization_id and m.user_id=auth.uid())
  );
-- Intentionally no client INSERT/UPDATE/DELETE policies.
-- Ingestion/approval require a separate audited privileged server workflow.
