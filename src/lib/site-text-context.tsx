import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./session";
import { getSiteText } from "./site-text.functions";
import { resolveSiteText, siteTextDefaults } from "./site-text";

const TextContext = createContext<Record<string, string>>({});
export function SiteTextProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const read = useServerFn(getSiteText);
  const query = useQuery({
    queryKey: ["site-text", "bundle", user?.id ?? "public"], enabled: !loading,
    staleTime: 60_000, retry: false,
    queryFn: async () => {
      if (user) return read();
      const result = await supabase.from("site_text").select("key,current_value");
      if (result.error) throw result.error;
      return result.data;
    },
  });
  return <TextContext.Provider value={Object.fromEntries((query.data ?? []).map(row => [row.key, row.current_value]))}>{children}</TextContext.Provider>;
}
export function useSiteText(page: string) {
  const bundle = useContext(TextContext);
  return (original: string) => {
    const definition = siteTextDefaults.find(row => row.page === page && row.default_value === original);
    return definition ? resolveSiteText(original, bundle[definition.key]) : original;
  };
}