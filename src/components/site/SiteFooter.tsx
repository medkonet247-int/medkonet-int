import { useSiteText } from "@/lib/site-text-context";
import { Link } from "@tanstack/react-router";
import { LOGO_URL } from "./Logo";
import { CONTACT } from "@/lib/contact";

export function SiteFooter() {
  const t = useSiteText("footer");
  const h = "text-sm font-semibold text-navy-foreground";
  // Full-height tap targets on phones, comfortable inline links from tablet up.
  const a =
    "inline-flex min-h-11 items-center text-sm text-navy-foreground/70 transition-colors hover:text-navy-foreground md:min-h-0 md:py-0.5";
  const links = [
    { to: "/join", label: t("Join MedKonet") },
    { to: "/login", label: t("Login") },
    { to: "/representatives", label: t("University Representatives") },
    { to: "/community-rules", label: t("Community Rules") },
    { to: "/privacy", label: t("Privacy Notice") },
  ] as const;

  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-12 lg:px-8">
        <div className="flex items-center gap-3 md:block md:space-y-3">
          <img src={LOGO_URL} alt="MedKonet Nigeria logo" width={56} height={56} className="size-14 shrink-0 rounded-full md:size-16" />
          <p className="max-w-xs text-sm text-navy-foreground/70 md:space-y-0">{t("Connecting Medicine and Surgery students across Nigerian universities.")}</p>
        </div>
        <nav aria-label={t("Explore")}>
          <p className={h}>{t("Explore")}</p>
          <ul className="mt-1 grid grid-cols-2 gap-x-4 sm:grid-cols-3 md:mt-2 md:flex md:flex-wrap md:gap-x-6">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className={a}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className={h}>
            <Link to="/contact" className="text-sm font-semibold text-navy-foreground transition-colors hover:text-navy-foreground hover:underline">{t("Contact")}</Link>
          </p>
          <ul className="mt-1 md:mt-2">
            <li><a href={CONTACT.whatsapp[0]} target="_blank" rel="noopener noreferrer" className={a}>{t("WhatsApp (line 1)")}</a></li>
            <li><a href={CONTACT.whatsapp[1]} target="_blank" rel="noopener noreferrer" className={a}>{t("WhatsApp (line 2)")}</a></li>
            <li><a href={`mailto:${CONTACT.email}`} className={`${a} break-all`}>{CONTACT.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-foreground/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-navy-foreground/60 sm:px-6 lg:px-8">
          © {new Date().getFullYear()}{t(" MedKonet Nigeria. Connecting Medical Minds, Building Better Futures.")}
        </p>
      </div>
    </footer>
  );
}
