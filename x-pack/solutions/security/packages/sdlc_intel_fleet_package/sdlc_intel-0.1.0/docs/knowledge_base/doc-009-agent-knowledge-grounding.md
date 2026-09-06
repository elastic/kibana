# DOC-009 · Agent knowledge grounding (AB-003)

All sdlc_intel fleet agents reference the `platform.core.integration_knowledge`
tool. Grounding requires the package knowledge base to be available to the
agent's context:

- **On install**, `docs/knowledge_base/*.md` assets ship with the package and
  the agents' `integration_knowledge` tool resolves them.
- **Degradation**: if knowledge retrieval is unavailable (Enterprise setting
  disabled, index missing), agents answer ungrounded — analyses must say so.
  The coverage-analysis agent instructions include an explicit "if the knowledge
  tool returns nothing, state that the answer is ungrounded" clause.
- **Auto-bind scope**: per-integration (the tool reads package-scoped knowledge),
  no global setting required for package agents.
