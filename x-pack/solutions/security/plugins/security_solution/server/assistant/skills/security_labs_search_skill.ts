/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { SECURITY_LABS_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';

/**
 * Content-first skill that teaches the agent how to find Security Labs articles
 * using platform core search tools (rather than adding a dedicated skill tool).
 */
export const SECURITY_LABS_SEARCH_SKILL: Skill = {
  namespace: 'security.security_labs_search',
  name: 'Security Labs Search',
  description: 'Find Security Labs articles via platform search tools',
  content: `# Security Labs Search

This skill helps you **find relevant Elastic Security Labs articles** in the **Elastic AI Assistant Knowledge Base**.

## What is “Security Labs” content?
Security Labs content is a curated set of documents (articles, research writeups, and references) about:
- malware and threat actor activity
- attack techniques and behaviors
- MITRE ATT&CK techniques and sub-techniques
- detection and rule-related context (rule names, detection logic, investigation guidance)

Security Labs documents are stored in the Knowledge Base and can be queried like any other indexed content.

## How to search for Security Labs articles (recommended)
Use the platform tool \`${platformCoreTools.search}\` and **include a Security Labs resource filter** in the natural language query.

- Always include this filter: \`kb_resource: ${SECURITY_LABS_RESOURCE}\`
- Prefer short, specific queries (malware family names, ATT&CK technique IDs, rule names).
- Ask for a small number of results first (e.g. “top 3”) and expand only if needed.

### Query construction pattern
Combine the user’s intent with the filter:

- “<user topic> and only Security Labs content (kb_resource: ${SECURITY_LABS_RESOURCE}). Return top 3 results.”

Examples:
- “SILENTTRINITY and only Security Labs content (kb_resource: ${SECURITY_LABS_RESOURCE}). Return top 3 results.”
- “MITRE ATT&CK T1059 PowerShell and only Security Labs content (kb_resource: ${SECURITY_LABS_RESOURCE}).”
- “rule name ‘Suspicious PowerShell’ and only Security Labs content (kb_resource: ${SECURITY_LABS_RESOURCE}).”
- “LSASS credential dumping and only Security Labs content (kb_resource: ${SECURITY_LABS_RESOURCE}).”

## Target to use (recommended up front)
To ensure you search the **AI Assistant Knowledge Base** (and not unrelated indices), pass the Knowledge Base **data stream name** as the \`index\` parameter to \`${platformCoreTools.search}\`.

- Knowledge Base data stream name format (space-scoped): \`.kibana-elastic-ai-assistant-knowledge-base-(SPACE)\`
  - Use the **current Kibana space id** for \`(SPACE)\` (do not hardcode \`default\` unless you are actually in the default space).
  - Example (default space only): \`.kibana-elastic-ai-assistant-knowledge-base-default\`
  - Example (custom space \`foo\`): \`.kibana-elastic-ai-assistant-knowledge-base-foo\`

Note: The Knowledge Base data stream is a Kibana/system (dot-prefixed) resource. If you are using a discovery tool,
you may need to include Kibana/system indices (e.g. \`includeKibanaIndices: true\`) to see it.

Then include the Security Labs filter in your query text (as shown above), e.g.:
- Search \`index: .kibana-elastic-ai-assistant-knowledge-base-(SPACE)\` for “SILENTTRINITY (kb_resource: ${SECURITY_LABS_RESOURCE}) top 3”.

## What to do with results
After you find relevant documents:
- open the highest-signal articles first (titles and snippets often indicate relevance)
- extract: IOCs, TTPs, ATT&CK mapping, detection opportunities, investigation steps
- when answering users, cite the key findings and connect them back to the user’s question
`,
  tools: [],
};


