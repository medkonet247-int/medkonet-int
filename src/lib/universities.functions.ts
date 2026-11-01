import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { isDevMode } from './security.server';
import { directoryFilters, universitySchema, reportFilters, reportCsv, type Directory, type MatchQueue, type Report } from './universities';
import type { Database } from '@/integrations/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';
async function admin(db: SupabaseClient<Database>, user: string) { const role = await db.rpc('has_role', { _user_id: user, _role: 'admin' }); if (isDevMode() || role.error || !role.data) throw new Error('Forbidden'); }
export const readDirectory = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => directoryFilters.parse(d)).handler(async ({ data, context }) => {
 const r = await context.supabase.rpc('directory_universities', { _q: data.q, _type: data.type, _state: data.state, _verification: data.verification, _active: data.active, _page: data.page }); if (r.error) throw new Error('Could not load university directory.'); return r.data as unknown as Directory;
});
export const saveUniversity = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => universitySchema.parse(d)).handler(async ({ data, context }) => {
 await admin(context.supabase, context.userId); const { id, ...values } = data; const r = id ? await context.supabase.from('universities').update(values).eq('id', id).select('id').single() : await context.supabase.from('universities').insert(values).select('id').single(); if (r.error) throw new Error(r.error.code === '23505' ? 'A university with this name already exists.' : 'Could not save university.'); return r.data;
});
export const changeUniversity = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ id: z.string().uuid(), action: z.enum(['verify','unverify','deactivate','reactivate']) }).parse(d)).handler(async ({ data, context }) => {
 await admin(context.supabase, context.userId); const values = data.action === 'verify' || data.action === 'unverify' ? { verification_status: data.action === 'verify' ? 'Verified' : 'Unverified' } : { active: data.action === 'reactivate' }; const r = await context.supabase.from('universities').update(values).eq('id', data.id).select('id').single(); if (r.error) throw new Error('Could not update university.'); return r.data;
});
export const readMatchingQueue = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ q: z.string().max(200).default(''), page: z.number().int().min(1).default(1) }).parse(d)).handler(async ({ data, context }) => {
 await admin(context.supabase, context.userId); const r = await context.supabase.rpc('university_matching_queue', { _q: data.q, _page: data.page }); if (r.error) throw new Error('Could not load matching queue.'); return r.data as unknown as MatchQueue;
});
export const matchUniversity = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ typed: z.string().min(1).max(200), university_id: z.string().uuid().optional(), create: universitySchema.omit({ id: true, name: true }).optional() }).refine(d => Boolean(d.university_id) !== Boolean(d.create), 'Choose one matching option.').parse(d)).handler(async ({ data, context }) => {
 await admin(context.supabase, context.userId); const r = await context.supabase.rpc('match_university', { _typed: data.typed, ...data.university_id ? { _university_id: data.university_id } : {}, ...data.create ? { _new: data.create } : {} }); if (r.error) throw new Error(r.error.code === '23505' ? 'This name already exists. Link to the existing university.' : r.error.message); return { matched: r.data };
});
export const readReports = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => reportFilters.parse(d)).handler(async ({ data, context }) => {
 await admin(context.supabase, context.userId); const r = await context.supabase.rpc('membership_reports', { ...data.from ? { _from: data.from } : {}, ...data.to ? { _to: data.to } : {}, _period: data.period }); if (r.error) throw new Error('Could not load reports.'); return r.data as unknown as Report;
});
export const exportReports = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => reportFilters.parse(d)).handler(async ({ data, context }) => {
 await admin(context.supabase, context.userId); const r = await context.supabase.rpc('membership_reports', { ...data.from ? { _from: data.from } : {}, ...data.to ? { _to: data.to } : {}, _period: data.period }); if (r.error) throw new Error('Could not export reports.'); return reportCsv(r.data as unknown as Report);
});
