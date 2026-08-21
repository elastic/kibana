# Yuliia TI POC vs Mustard correlation (and how correlation works)

Working notes comparing:

- [Yuliia Naumenko POC #269002](https://github.com/elastic/kibana/pull/269002): Phase A Intelligence Hub / Agent Builder TI
- [Seth Goodwin #275243](https://github.com/elastic/kibana/pull/275243): Mustard threat-intelligence correlation engine rebased onto `main`

Plus a walkthrough of `extract_diamond` and the `correlate_threat` pipeline.

Deeper design detail lives in `common/threat_intelligence/CORRELATION_DESIGN.md`.

---

## 1. Comparison: #269002 vs #275243

Short version: **#269002** is the Phase A **Intelligence Hub / Agent Builder TI platform**. **#275243** ports Seth’s **Mustard correlation engine** onto that platform (rebased onto `main`), plus IOC-quality and hardening work.

### What Yuliia’s POC already had

The ingest → enrich → hunt → digest loop:

- Feed catalog + adapters (`rss` / `stix` / `taxii` / etc.) and scheduled ingest
- Report enrichment (IOCs, behaviors, categories, regions)
- Indicator sync for Indicator Match
- Two-tier hunt (`hunt_for_threat` → `hunt_behavior`) + orchestrator
- Digests / subscriptions / advisories
- Intelligence Hub UI, alert flyout links, Agent Builder skill + attachments
- Env-hit backfill from alerts to reports

That is the continuous TI ops product surface.

### What Seth’s branch adds on top

Mustard’s differentiator: **correlate a new observation to prior reports via Diamond Model evidence**, not just ingest and hunt.

1. **Diamond enrichment**  
   Extract adversary / capability / infrastructure / victim onto reports (`extract_diamond`), with dedicated semantic fields for retrieval.

2. **Correlation pipeline** (`correlate_threat` and friends)  
   Anchor + diamond search, candidate collapse, triage, synthesis. Cluster-first findings (same intrusion across vendors). Explicitly framed as **correlation / evidence**, not automated attribution.

3. **Stronger IOC extraction / tiering**  
   Compound-first tokenization, heuristic tiers (`discriminating` / `contextual` / `reference` / `denied` / `uncertain`), HTML structure + section mining (IOC tables vs references), chrome stripping, value-only `ioc_set_hash`, and related refinements. Big quality jump over Phase A’s flatter regex path.

4. **Relevance / evidence-tier gating**  
   Classifier so junk or non-intel content is not treated like real CTI.

5. **Hardening and ops polish on the shared base**  
   Space isolation on report reads, SSRF guards on fetch, saved-view SO registration, per-stage GenAI connector UI settings, PR-deploy flag wiring, etc.

### How to think about the split

| Layer | Mostly Yuliia (#269002) | Mostly Seth (#275243) |
| --- | --- | --- |
| Bring intel in and enrich it | yes | improves IOC quality + adds Diamond |
| Hunt in the customer env | yes | uses the better IOC/behavior inputs |
| Link reports to each other by Diamond | no | yes (Mustard) |
| Hub / digests / flyout / skill shell | yes | builds on it |

So #275243 is not a rewrite of Hub. It is **Mustard’s correlation brain + better indicator science**, living inside Yuliia’s Hub scaffolding.

Demo follow-ups on top of Seth’s line (for example #278905 / `mustard-correlation-v2`) add Dark Watch renames, continuous-hunt persist/show/Deploy, and related last-mile demo work. That is a third layer beyond the #269002 → #275243 delta.

---

## 2. What `extract_diamond` does

It turns report text into a **Diamond Model** summary: four vertices that describe an intrusion without listing brittle IOCs.

| Vertex | What it captures |
| --- | --- |
| **Adversary** | Actor names/aliases, operator habits, tempo, language artifacts |
| **Capability** | Techniques, tools, persistence/evasion patterns (behavior, not malware brand names) |
| **Infrastructure** | Hosting patterns, C2 shape, abuse of legit services (GitHub-as-C2, etc.). Patterns, not raw IPs/domains |
| **Victim** | Who/what is targeted, geofencing, infection scope |

For each vertex the LLM returns:

- `signal`: `HIGH` | `PARTIAL` | `NONE`
- `summary`: dense prose meant for **semantic search / embeddings**, not primarily for human reading

Important design choices from Mustard:

- **No specific IPs, domains, hashes, or URLs** in any vertex (those stay in `extracted.iocs`)
- Cross-vertex exclusion rules so malware names, geofencing, etc. land in the right bucket
- Prefer **observed evidence** over speculation
- Normal path: one structured LLM call for all four vertices
- Fallback: four per-vertex calls if the big call blows context or fails

When this runs in enrichment, those summaries land on the report as `extracted.diamond.*` with `semantic_text` embeddings (Jina). That is the index side of correlation.

Implementation: `server/threat_intelligence/services/extract_diamond.ts`.

---

## 3. What the correlation pipeline does

`correlate_threat` answers: **given this new observation, which prior reports look related, and what is the evidence?**

It does **not** decide “this is APT28.” It surfaces supporting and counter evidence for an analyst.

### Inputs and depth

Input modes:

- `raw_text`: paste a case / alert notes / new report text
- `report_id`: use an already-stored report (and its stored diamond if present)

Depth knobs (`extract` / `knn` / `triage` / `full`) let you stop early for debugging or cheaper runs.

Implementation: `server/threat_intelligence/services/correlate_threat.ts`.

### Stage flow

```text
Observation
    ├─ Anchors (deterministic)          ├─ Diamond (LLM)
    │  IOCs / TTPs / actors / families  │  extract_diamond
    │         │                         │         │
    │         ▼                         │         ▼
    │  search_by_anchors                │  search_by_diamond
    │  (exact / set-hash style hits)    │  (4 semantic searches, one per vertex)
    │         │                         │         │
    └─────────┴──────────── merge ──────┘─────────┘
                              │
                              ▼
                     keyword gap-fill (optional rescue)
                              │
                              ▼
                     collapse / cluster candidates
                              │
                              ▼
                     triage (LLM picks ~6–12)
                              │
                              ▼
                     synthesize_correlations
                              │
                              ▼
                     CorrelationFindings
                     (clusters, lead + supporting,
                      supporting_evidence + counter_evidence,
                      suggested next steps)
```

### Stage by stage

1. **Anchors**  
   Cheap, no LLM. Pull concrete join keys (IOCs, techniques, actors) and search the corpus for exact/near exact overlap. Good for “same hash / same C2 host” hits.

2. **Diamond extract + search**  
   Summarize the observation into four vertices, then semantic-search each non-`NONE` vertex against stored `extracted.diamond.*.summary`. This catches **same tradecraft, different IOCs**.

3. **Merge**  
   Union of anchor hits and diamond hits, with origin tags like `ioc_hit`, `knn_inf`, etc., so you can see *why* a candidate showed up.

4. **Keyword gap-fill**  
   If retrieval missed named entities that should have matched, an LLM spots the gaps and runs phrase queries to pull extra candidates.

5. **Collapse / cluster**  
   Group reports that look like the same intrusion across vendors (shared IOCs, set hash, actors, techniques, related-report edges).

6. **Triage**  
   LLM narrows the pool to a shortlist (confidence floor is mostly a context-budget control).

7. **Synthesize**  
   Produce `CorrelationFindings`: clustered leads, supporting reports, evidence for and against, analyst notes, suggested next steps. Framing is evidence, not attribution.

Optional later step (design): **deep synthesize** a cluster when you want the supporting reports pulled into a fuller comparison.

### How the two fit together

- **`extract_diamond` at enrich time** = index every report so future correlations can find it by tradecraft shape.
- **`extract_diamond` inside `correlate_threat`** = describe the *query* the same way, then search.
- **Anchors** = hard matches on rotating identifiers.
- **Diamond search** = soft matches on durable behavior / infra patterns.

Together that is Mustard’s bet: IOC matching alone is brittle; Diamond-shaped semantic retrieval plus exact anchors gives both precision and recall across vendor writeups of the same campaign.
