# DOC-004 · Agent Builder Fleet Agent Authoring Guide

Authoring package-managed agents (`kibana/agent/` assets) for Fleet-installed ETL packages.

## Anatomy

```yaml
# kibana/agent/sdlc-analyst.yml
name: SDLC Analyst
description: Answers delivery-health questions from the intel corpus
instructions: |
  Query via sdlc.* tools. Prefer semantic search for fuzzy questions...
tools:
  - sdlc.search
  - sdlc.person-timeline
  - sdlc.corpus-size
model: { connector_id: "{{genai_connector_id}}" }
```

## Rules

1. **Tools before prompts.** Ship ES|QL-backed tools (`sdlc.*`) as assets; agent instructions reference tools, not raw ES|QL — the LLM then can't typo queries.
2. **Dot-namespaced tool IDs are mandatory** (`sdlc.search`, never `sdlc_search`): the MCP route exposes `?namespace=sdlc` filtering on the prefix before the **last** dot — underscore/hyphen ids or multi-dot ids fall outside every namespace. This cut our MCP surface 62→8 tools (−87% context weight).
3. **Curate the MCP surface client-side** with `?namespace=<ns>` on the MCP URL — one config line, no platform code.
4. **Knowledge → context**: put operational knowledge in `docs/knowledge_base/`; agents cite it. (Full wiring AB-003 is platform work.)
5. **Honest tool descriptions.** If a tool is ES|QL `MATCH` over an ELSER field (BM25 ranking, not semantic ranking), say so in the description — agents will otherwise oversell results.

## Verified in production

8 `sdlc.*` tools, namespace-curated, served over the public MCP endpoint, consumed by an external agent (Hermes) — 8/8 discovered and executable.
