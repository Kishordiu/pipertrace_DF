import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow, SiteHeader } from "@/components/site";

export const Route = createFileRoute("/_authenticated/cases/")({
  head: () => ({ meta: [{ title: "Cases — PiperTrace" }, { name: "description", content: "Your case history." }] }),
  component: Cases,
});

function Cases() {
  const q = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("id,title,category,sha256,size_bytes,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex items-end justify-between">
          <div><Eyebrow>Case history</Eyebrow><h1 className="mt-3 text-4xl font-medium tracking-tight">Cases</h1></div>
          <Link to="/studio" className="rounded-full bg-ink px-5 py-3 text-sm text-ink-foreground">New case</Link>
        </div>
        {q.isLoading && <p className="mt-10 text-muted-foreground">Loading…</p>}
        {q.error && <p className="mt-10 text-destructive">{(q.error as Error).message}</p>}
        {q.data?.length === 0 && <p className="mt-10 text-muted-foreground">No cases yet. Open one from the Studio.</p>}
        <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
          {q.data?.map((c) => (
            <Link key={c.id} to="/cases/$id" params={{ id: c.id }} className="grid grid-cols-12 items-center gap-4 p-5 hover:bg-muted">
              <span className="col-span-2 font-serif text-lg italic capitalize">{c.category}</span>
              <span className="col-span-4 truncate">{c.title}</span>
              <span className="col-span-4 truncate font-mono text-xs text-muted-foreground">{c.sha256}</span>
              <span className="col-span-2 text-right text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
