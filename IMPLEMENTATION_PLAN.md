# IMPLEMENTATION PLAN — Studies UI/UX Finalization

> Generated per Frontend-Elite-Core-Skill before any further production changes.
> Date: 2026-09-25

## 1. Ultimate Goal

Deliver a clean, consistent, light-theme dashboard that the user's father can use daily without friction:

- Zero native OS controls (`<select>`, radio, checkbox chrome).
- Reliable page + modal scrolling on every device (phone / iPad / MacBook / HP / large desktop).
- Consistent spacing hierarchy using existing design tokens.
- Touch targets ≥ 44px.
- No forced zoom on desktop; modals fit comfortably at 100% zoom.
- Natural, non-AI-looking UI with IBM Plex Sans Arabic.

## 2. Current Verified State (re-scan 2026-09-25)

| Item | Status | Evidence |
|------|--------|----------|
| Native `<select>` anywhere in `src/` | **GONE** | `grep -rn '<select' src/` → 0 hits |
| AppSelect usage | Dashboard, StudyDetail (×3), ImportModal, ui.tsx | 4+ call sites |
| Modal positioning | `items-center` + `max-h-[min(90dvh,820px)]` + `modal-scroll` | ui.tsx |
| Page scroll | `overflow-y: auto !important` + `100dvh` on html/body | globals.css |
| Design tokens | `--s-1`…`--s-9`, radii, colors already present | globals.css |
| Live deploy | https://rhmanbit.workers.dev | README |

## 3. Step-by-step Structural Changes (this session)

1. **Docs only (no production code yet)**  
   - Rewrite `CODEMAP.md` error inventory → mark native-select items ✅.  
   - Update `README.md` status table.  
   - Keep this `IMPLEMENTATION_PLAN.md` as the living plan.

2. **Remaining P1 polish (only if browser loop shows real defects)**  
   - Raise any residual touch targets that are still < 44px.  
   - Tighten StudyDetail header hierarchy if visual density is still high.  
   - Ensure AppSelect listbox never escapes viewport on small screens.

3. **Verification loop (mandatory)**  
   - Inspect live site + local `npm run dev` if env allows.  
   - Check: Dashboard sort, StudyDetail filters, Import column mapping, Export chips, Modal open/close/scroll, language switch, responsive breakpoints.  
   - Confirm zero console errors and no native OS picker on mobile emulation.

## 4. Potential Breaking Points

- AppSelect open state + click-outside must not fight with Modal focus trap.
- Dynamic options in StudyDetail (country/federation counts) must stay in sync after import/delete.
- Local-first storage + server snapshot hydration must not flash empty roster.
- Cloudflare D1 / OpenNext build must still succeed after any CSS token change.

## 5. Exit Criteria

- CODEMAP + README reflect accurate ✅ status.
- Browser loop (live or local) shows: no native selects, modals centered & scrollable, filters usable on 360px–1920px.
- No new TypeScript or runtime errors.
