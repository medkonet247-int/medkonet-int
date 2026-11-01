import { describe,it,expect } from 'vitest';
import { isOnboarded,universitySchema,reportFilters,reportCsv } from '@/lib/universities';
describe('Phase 4 rules',()=>{
 it('counts only Approved and confirmed onboarding as directory members',()=>{expect(isOnboarded('Approved','2026-11-01')).toBe(true);expect(isOnboarded('Approved',null)).toBe(false);expect(isOnboarded('Pending','2026-11-01')).toBe(false);expect(isOnboarded('Rejected','2026-11-01')).toBe(false);});
 it('accepts only Federal State and Private university types',()=>{const v={name:'University',state:'Lagos',location:'Ikeja'};for(const university_type of ['Federal','State','Private'])expect(universitySchema.safeParse({...v,university_type}).success).toBe(true);expect(universitySchema.safeParse({...v,university_type:'Other'}).success).toBe(false);});
 it('rejects reversed reporting dates',()=>{expect(reportFilters.safeParse({from:'2026-11-02',to:'2026-11-01'}).success).toBe(false);});
 it('exports aggregate fields only even when extra personal data is supplied',()=>{const report={total:1,universities:1,states:1,unmatchedTotal:0,rows:[{id:'x',name:'University',state:'Lagos',total:1,pending:0,approved:1,rejected:0,onboarded:0,email:'private@example.com',whatsapp_number:'2348000000000'}],unmatched:[],growth:[]};const csv=reportCsv(report);expect(csv).toContain('University');expect(csv).not.toContain('private@example.com');expect(csv).not.toContain('2348000000000');});
 it('neutralizes spreadsheet formulas in university names',()=>{expect(reportCsv({total:1,universities:0,states:1,unmatchedTotal:1,rows:[],unmatched:[{name:'=1+1',total:1}],growth:[]})).toContain("'=1+1");});
});
