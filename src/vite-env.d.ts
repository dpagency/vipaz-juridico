/** Vite browser environment contract, without requiring Vercel's type scanner to resolve vite/client. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** TypeScript 7 side-effect stylesheet imports (Vite transforms CSS during bundling). */
declare module '*.css' {
  const stylesheet: string;
  export default stylesheet;
}
