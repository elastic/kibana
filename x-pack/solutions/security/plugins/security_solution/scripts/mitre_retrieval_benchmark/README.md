# Does the managed MITRE index need semantic search?

Retrieval A/B over the managed MITRE ATT&CK index (v19.1, 712 entities), against
a local Elasticsearch with ELSER v2.

All numbers in this document come from a single run:

```
SAMPLES_PER_STRATUM=50 node x-pack/solutions/security/plugins/security_solution/scripts/mitre_retrieval_benchmark.js
```

Raw output: `fixtures/benchmark_results.json`. The independently-generated query
expansions used by the `*_expanded` arms are in `fixtures/expansions_output.json`
(pass via `EXPANSIONS_JSON=`), and the prompt list they were generated from is in
`fixtures/expansion_prompts_input.json`.

## TL;DR

- **UI: keyword only.** Users type IDs and names. Tuned BM25 matches or beats
  hybrid on every UI-shaped query, and semantic actively hurts exact-ID lookup
  (40% vs 100% R@1). A semantic leg here costs latency and buys nothing.
- **AI tooling: hybrid.** When the query is a user's prompt, hybrid is the best
  arm nearly everywhere. Technique-shaped prompts go from 87% to 100% success.
- **Query expansion: no.** An LLM rewriting the prompt before retrieval made
  things *worse* on an unbiased prompt set. Not a substitute for hybrid.
- Both modes already exist behind `MitreAttackDataClient.search({ mode })`.

## Metrics

Two numbers matter, and mixing them up is easy:

- **R@1** — was the correct entity ranked first. The right metric for the UI,
  where a human scans a list.
- **S@25 (success@25)** — did *any* correct entity land in the top 25. The right
  metric for the AI tools, which hand the whole candidate block to an LLM that
  then picks one. `MAX_TECHNIQUE_CANDIDATES` in `add_mitre_mappings` is 25.

Plain recall@k divides by the number of ground-truth labels, so a prompt tagged
with three techniques scores 33% for surfacing a correct one. That understates
the multi-label strata badly. For single-label strata R@k and S@k are identical.

## UI-shaped queries (R@1)

| stratum | n | bm25_poc | bm25_tuned | semantic_only | hybrid_tuned |
|---|---|---|---|---|---|
| exact_id | 50 | **100** | **100** | 40.0 | 96.0 |
| exact_name | 50 | **100** | **100** | 98.0 | 98.0 |
| near_name | 50 | 54.0 | **94.0** | 52.0 | 68.0 |
| description_lead | 50 | 84.0 | 94.0 | **98.0** | 94.0 |

`near_name` drops a word and transposes two characters. `description_lead` is
the first sentence of the ATT&CK description.

**Tuned BM25 wins the UI outright.** Fuzziness and field boosts take near-name
R@1 from 54% to 94% with no new dependency. Semantic can only ever be a second
leg, never a replacement: it gets 40% on exact IDs where keyword gets 100%.

## Prompt-shaped queries (S@25, with S@10 in parentheses)

These are the strata that matter for AI tooling — the only ones whose queries
were not derived from the entity's own text. Every other stratum structurally
flatters BM25.

| stratum | n | bm25_poc | bm25_tuned | semantic_only | hybrid_tuned |
|---|---|---|---|---|---|
| indep_technique | 15 | 86.7 (66.7) | 86.7 (80.0) | **100** (93.3) | **100** (93.3) |
| indep_abstract | 13 | 53.8 (30.8) | 46.2 (30.8) | **69.2** (38.5) | 61.5 (**53.8**) |
| indep_tactic | 15 | 33.3 (33.3) | 40.0 (33.3) | 46.7 (40.0) | 40.0 (40.0) |
| behavioral | 50 | 80.0 (52.0) | 86.0 (74.0) | **92.0** (88.0) | **92.0** (86.0) |
| rule_prompt | 25 | 52.0 (36.0) | 60.0 (44.0) | **64.0** (48.0) | **64.0** (**56.0**) |

- `indep_*` — 43 prompts written by a subagent with no access to the ATT&CK
  corpus, grouped by abstraction level, then hand-labelled against v19.1.
- `behavioral` — 50 analyst phrasings that deliberately share no vocabulary with
  the technique name.
- `rule_prompt` — natural-language rule descriptions reused from
  `kbn-evals-suite-security-ai-rules`.

**Technique-shaped prompts are solved** (100% vs 87% for keyword) — and those are
the dominant shape for AI rule creation, where the user describes the behaviour
they want detected. **Abstract prompts are the weak spot** at 62–69%, and
**tactic prompts look worst of all at 40–47%** — but see below, that number is
misleading.

### The tactic numbers are a granularity artifact

`indep_tactic` gold labels are tactic IDs, while a useful answer for rule
creation is usually a *technique*. Scoring a hit as the gold tactic **or any
technique belonging to it** (S@10):

| arm | strict | tactic-aware |
|---|---|---|
| bm25_tuned | 33.3 | 53.3 |
| hybrid_tuned | 40.0 | 73.3 |

The real tactic-level number is ~73%, not ~40%. Worth fixing in the labels.

## Version drift (v18.1 → v19.1)

Derived from MITRE's own `revoked-by` STIX relationships, encoded in
`version_drift.ts`. R@1:

| stratum | n | bm25_tuned | semantic_only | hybrid_tuned |
|---|---|---|---|---|
| v19_new | 24 | **100** | **100** | **100** |
| stale_name | 22 | 72.7 | **81.8** | 72.7 |
| stale_id | 17 | 0.0 | 0.0 | 0.0 |

- **New v19.1 content is found perfectly by plain keyword.** Content no model can
  have memorised is findable because it is *in the index*, not because of how it
  is embedded. This is the core grounding result.
- **Retired identifiers fail on every arm.** A pre-v19 model asking for
  `T1562.001` gets nothing. Semantic fails *unsafely* — it returns confident
  nonsense (`T1567.001 Exfiltration to Code Repository`) by pattern-matching
  digits, where keyword returns nothing and the caller can detect the failure.

Retired IDs are largely out of scope if we only ever serve current MITRE, and
the feature's planned `revoked` / `superseded_by_id` fields cover the rest. A
`retired_ids` alias field takes this stratum from 0% to 100% R@1 for ~2ms if we
ever want it.

## Query expansion does not help

The hypothesis: an LLM rewrites a vague prompt into behavioural language before
retrieval, letting BM25 do the work and dropping the ELSER dependency. An early
hand-written expansion took `prompt_abstract` from 37.5% to 100%, which looked
decisive.

It did not survive replication. Expansions for all 93 prompts were generated by
a subagent allowed to read *only* the prompt list — verified byte-identical
prompts, zero ATT&CK IDs or official names leaked. On the independent prompts,
expansion **lost** to plain hybrid on every stratum (S@25):

| stratum | hybrid_tuned | hybrid_expanded |
|---|---|---|
| indep_technique | **100** | 80.0 |
| indep_abstract | **61.5** | 38.5 |
| indep_tactic | **40.0** | 6.7 |

Expansion only helped on the prompts *I* wrote, which is author bias — the same
mind imagined both the prompt and the rewrite. It also triples latency (155ms vs
61ms p50) and adds an LLM call per query.

One real exception: at the tactic level, expansion scores 73.3% tactic-aware
(vs 0% strict) because it retrieves techniques under the right tactic, and
expansion *plus* hybrid reaches 100%. If a query planner is ever built, scope it
to tactic-level prompts and measure it at technique granularity.

## Cost

Cold-cache p50 latency, measured on query strings no arm has embedded before
(Elasticsearch caches the query-side ELSER embedding per string, so a naive
harness reports ~6ms for whichever semantic arm runs second):

| arm | p50 | p95 |
|---|---|---|
| bm25_poc | 3 ms | 7 ms |
| bm25_tuned | 19 ms | 49 ms |
| semantic_only | 45 ms | 66 ms |
| hybrid_tuned | 61 ms | 114 ms |
| hybrid_expanded | 155 ms | 176 ms |

Absolute values are from an unloaded laptop and vary between runs; the ordering
is stable and is the point. Beyond latency, semantic costs an ELSER deployment,
~3.5 min to embed 712 entities on hydration, and a fallback path for when the
inference endpoint is unavailable — already implemented as `mode: 'auto'`.

## Recommendation

1. **Ship keyword as the UI default and hybrid for the AI tools.** Already built;
   `mode: 'auto'` degrades to keyword when ELSER is absent.
2. **Keep the tuned keyword query.** Fuzziness and field boosts are most of the
   gain on UI queries and cost nothing.
3. **Skip query expansion.**
4. **Fix the tactic labels** to accept techniques under the gold tactic.
5. **Evaluate corpus enrichment** (below) before concluding abstract prompts are
   as good as they get.

## Follow-up: enriching the indexed text

Not included in the numbers above — measured separately.

We currently embed only `name + tactics + description`. The v19.1 STIX bundle
also carries 699 detection-strategy objects wired to 1,758 analytics, plus
16,903 procedure examples. Analytic text reads like *"Monitor
/var/log/audit/audit.log and DNS resolver logs for repeated failed lookups or
connections to high-entropy domain names"* — exactly the observable-behaviour
vocabulary that abstract prompts use and that descriptions lack.

Indexing that content (S@25):

| stratum | hybrid_tuned | + enrichment |
|---|---|---|
| indep_abstract | 61.5 | **76.9** |
| prompt_abstract | 87.5 | **100** |
| behavioral | 90.0 | **98.0** |
| indep_technique | 100 | 100 |

It beats query expansion on every count: deterministic, no per-query LLM call,
and it lifts BM25 as well as hybrid. Costs are modest — artifact 1.2 MB → 2.2 MB,
index 3 MB → 6 MB, embedding 202s. Caveat: tactic strata dip slightly because
tactics receive no enrichment while technique docs get richer and outrank them.
