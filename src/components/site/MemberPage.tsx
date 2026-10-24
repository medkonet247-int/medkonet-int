import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Container, PageHeader, Card } from "@/components/site/Page";

type Section = { heading: string; body: string };

export function MemberPage({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["member_page", slug],
    queryFn: async () => {
      // RLS returns nothing unless the user is an approved member or admin.
      const { data, error } = await supabase.from("member_pages").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" /></div>;
  if (isError || !data) return <Container className="py-24 text-center"><p>This page is available to approved members only.</p></Container>;
  return (
    <>
      <PageHeader eyebrow="Members" title={data.title} intro={data.intro} />
      <section className="py-14">
        <Container className="grid max-w-4xl gap-5">
          {(data.sections as Section[]).map((s) => (
            <Card key={s.heading}>
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </Container>
      </section>
    </>
  );
}
