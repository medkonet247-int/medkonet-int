export function seo(title: string, description: string, opts: { noindex?: boolean } = {}) {
  const full = `${title} | MedKonet Nigeria`;
  return {
    meta: [
      { title: full },
      { name: "description", content: description },
      { property: "og:title", content: full },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...(opts.noindex ? [{ name: "robots", content: "noindex" }] : []),
    ],
  };
}
