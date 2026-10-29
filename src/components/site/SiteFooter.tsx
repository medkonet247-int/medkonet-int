import { useSiteText } from "@/lib/site-text-context";
import { Link } from "@tanstack/react-router";
import { LOGO_URL } from "./Logo";
import { CONTACT } from "@/lib/contact";

export function SiteFooter() {
  const t = useSiteText("footer");
  const h = "text-sm font-semibold text-navy-foreground";
  const a = "text-sm text-navy-foreground/70 transition-colors hover:text-navy-foreground";
  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <img src={LOGO_URL} alt="MedKonet Nigeria logo" width={72} height={72} className="size-18 rounded-full" />
          <p className="max-w-xs text-sm text-navy-foreground/70">{t("A growing community connecting Medicine and Surgery students across Nigerian universities. Different Universities. One Medical Family.")}</p>
        </div>
        <div>
          <p className={h}>{t("Explore")}</p>
          <ul className="mt-4 space-y-2">
            <li><Link to="/" className={a}>{t("Home")}</Link></li>
            <li><Link to="/about" className={a}>{t("About")}</Link></li>
            <li><Link to="/contact" className={a}>{t("Contact")}</Link></li>
            <li><Link to="/join" className={a}>{t("Join MedKonet")}</Link></li>
            <li><Link to="/login" className={a}>{t("Login")}</Link></li>
          </ul>
        </div>
        <div>
          <p className={h}>{t("Community")}</p>
          <ul className="mt-4 space-y-2">
            <li><Link to="/community" className={a}>{t("Community")}</Link></li>
            <li><Link to="/resources" className={a}>{t("Academic Resources")}</Link></li>
            <li><Link to="/mentorship" className={a}>{t("Mentorship")}</Link></li>
            <li><Link to="/events" className={a}>{t("Events and Programmes")}</Link></li>
            <li><Link to="/representatives" className={a}>{t("University Representatives")}</Link></li>
            <li><Link to="/community-rules" className={a}>{t("Community Rules")}</Link></li>
            <li><Link to="/privacy" className={a}>{t("Privacy Notice")}</Link></li>
          </ul>
        </div>
        <div>
          <p className={h}>{t("Contact")}</p>
          <ul className="mt-4 space-y-2">
            <li><a href={CONTACT.whatsapp[0]} target="_blank" rel="noopener noreferrer" className={a}>{t("WhatsApp (line 1)")}</a></li>
            <li><a href={CONTACT.whatsapp[1]} target="_blank" rel="noopener noreferrer" className={a}>{t("WhatsApp (line 2)")}</a></li>
            <li><a href={`mailto:${CONTACT.email}`} className={`${a} break-all`}>{CONTACT.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-foreground/10">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-navy-foreground/60 sm:px-6 lg:px-8">
          © {new Date().getFullYear()}{t(" MedKonet Nigeria. Connecting Medical Minds, Building Better Futures.")}
        </p>
      </div>
    </footer>
  );
}
