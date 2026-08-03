# Daybreak Threat Intel

*For Paul / threat intel workstream · Seth · 2026-07-07*

---

## The problem

Daybreak describes **Watches, Proposals, and Evidence** — how autonomous security work gets reviewed and acted on. It does **not** describe where **external threat intelligence** comes from or how it stays fresh, typed, and trustworthy.

That gap is **IntelHub**: ingest → gate → enrich → corpus (`.kibana-threat-reports`) → routes/skills Daybreak calls. IntelHub is **platform substrate**.

For **October MVP**, the intel-critical path is narrow: **Attack Discovery output → correlate against the corpus → external-intel Evidence on a Proposal** ([#17941](https://github.com/elastic/security-team/issues/17941)). Without a running corpus and a wired `correlate_threat` skill, Officer is just reasoning over AD text with no published-intel grounding.

A **stretch** path is **Dark Watch**: environment context joined to threat knowledge via **Security Knowledge Indicators** ([#17949](https://github.com/elastic/security-team/issues/17949)) — Threat SKIs fed by the same corpus. Officer MVP needs **Evidence**; Dark Watch needs **SKIs + hunts**.  

Economicly viable and locally relevant hunt hypothesis generation requires rich ingested intelligence, such as vendor reporting, paired with local enviroment profiles.

**Scope of this doc:** intel dependencies only. Alert FP, proposal queue UX, approval gates, etc. live in the Daybreak plan, not here.

**Diagram:** [daybreak_intel_flow.png](daybreak_intel_flow.png) · details in [daybreak_intel.md](daybreak_intel.md)

---



## Adjacent issues



### Daybreak (security-team)


| Issue | Title | Why it matters for intel |
| ----- | ----- | ------------------------ |
| [#17941](https://github.com/elastic/security-team/issues/17941) | Integrate Attack Discovery outputs into Daybreak proposal and investigation flows | Where `correlate_threat` must plug in |
| [#17942](https://github.com/elastic/security-team/issues/17942) | Define Daybreak Proposal object schema | Evidence must accept TI citations |
| [#17861](https://github.com/elastic/security-team/issues/17861) | [Attack Discovery][Epic] Threat Actor Correlation for Attack Discoveries | Overlaps Mustard; avoid duplicate paths |
| [#17948](https://github.com/elastic/security-team/issues/17948) | Define Dark Watch continuous hunt MVP slice | Corpus + env-specific hunts |
| [#17949](https://github.com/elastic/security-team/issues/17949) | Define Security Knowledge Indicators and Significant Security Events model | Threat SKI fields come from IntelHub |
| [#17959](https://github.com/elastic/security-team/issues/17959) | Evaluation plan and golden datasets | Seeded corpus + AD scenarios |




### IntelHub / Mustard (internal)


| Resource             | |
| -------------------- | --- |
| Flow one-pager       | [daybreak_intel.md](daybreak_intel.md) (this folder) |
| North star           | `mustard/ClaudeState/NORTH_STAR.md` |
| Routing fabric pitch | `mustard/ClaudeState/routing_fabric_pitch.md` |
| Code                 | `kibana-threat-intel-poc` (branch `mustard-correlation`) |




### Daybreak docs (project-daybreak)


| Doc                                                                                                         |     |
| ----------------------------------------------------------------------------------------------------------- | --- |
| [MVP spec](https://github.com/elastic/project-daybreak/blob/main/docs/daybreak-mvp-spec.md)                 |     |
| [Watch catalog](https://github.com/elastic/project-daybreak/blob/main/docs/daybreak-watch-catalog.md)       |     |
| [Dark Watch + SKIs](https://github.com/elastic/project-daybreak/blob/main/docs/daybreak-dark-deep-watch.md) |     |
| [Issue plan](https://github.com/elastic/project-daybreak/blob/main/docs/daybreak-github-issue-plan.md)      |     |


---



## Open questions (add as we go)

- Evidence shape for TI citations — who defines in #17942?
- #17861 vs Mustard `correlate_threat` — one path or two?
- Approved external TI sources for MVP — is IntelHub source catalog the answer?
- Dark Watch in October or not?

