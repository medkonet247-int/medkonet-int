import { z } from 'zod';
export const universityTypes = ['Federal', 'State', 'Private'] as const;
export const universitySchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(2).max(200), university_type: z.enum(universityTypes), state: z.string().trim().min(2).max(100), location: z.string().trim().min(2).max(160) });
export const directoryFilters = z.object({ q: z.string().max(200).default(''), type: z.enum(['', ...universityTypes]).default(''), state: z.string().max(100).default(''), verification: z.enum(['', 'Unverified', 'Verified']).default(''), active: z.enum(['', 'Active', 'Deactivated']).default(''), page: z.number().int().min(1).max(100000).default(1) });
export const reportFilters = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).default(''), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).default(''), period: z.enum(['week', 'month']).default('month') }).refine(d => !d.from || !d.to || d.from <= d.to, 'Start date must not be after end date.');
export type University = { id: string; name: string; university_type: typeof universityTypes[number]; state: string; location: string; verification_status: 'Verified' | 'Unverified'; active: boolean; approved_count: number | null; onboarded_count: number };
export type Directory = { rows: University[]; total: number; states: string[] };
export type MatchQueue = { rows: { name: string; total: number }[]; total: number };
export type ReportRow = { id: string; name: string; state: string; total: number; pending: number; approved: number; rejected: number; onboarded: number };
export type Report = { total: number; universities: number; states: number; unmatchedTotal: number; rows: ReportRow[]; unmatched: { name: string; total: number }[]; growth: { period: string; applications: number; approvals: number }[] };
export function isOnboarded(status: string, confirmed: string | null) { return status === 'Approved' && confirmed !== null; }
export function reportCsv(report: Report) {
  const cell = (v: string | number) => { const s = String(v); return `"${s.match(/^[\s]*[=+@-]/) ? "'" : ''}${s.replace(/"/g, '""')}"`; };
  const rows: (string | number)[][] = [['Section','University or period','State','Total applications','Pending','Approved','Rejected','Onboarded','New applications','First approvals'], ['Summary','All applications','',report.total,'','','','','',''], ['Summary','Universities represented','',report.universities,'','','','','',''], ['Summary','States represented','',report.states,'','','','','',''], ...report.rows.map(r => ['University',r.name,r.state,r.total,r.pending,r.approved,r.rejected,r.onboarded,'','']), ...report.unmatched.map(r => ['Unmatched',r.name,'',r.total,'','','','','','']), ...report.growth.map(r => ['Growth',r.period,'','','','','','',r.applications,r.approvals])];
  return '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}
