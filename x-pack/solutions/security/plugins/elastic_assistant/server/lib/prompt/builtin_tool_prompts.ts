/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Prompt } from '@kbn/security-ai-prompts';

export const builtinPromptGroupId = 'builtin-security-tools';

// Builtin tool prompts for internal tools (onechat agent builder)
// These prompts include additional instructions for proper tool usage
export const builtinToolPrompts: Prompt[] = [
  {
    promptId: 'AlertCountsTool',
    promptGroupId: builtinPromptGroupId,
    prompt: {
      default:
        'Call this for the counts of last 24 hours of open and acknowledged alerts in the environment, grouped by their severity and workflow status. The response will be JSON and from it you can summarize the information to answer the question.\n\nWORKFLOW: This tool requires NO parameters. You MUST follow this exact sequence:\n1. First call the assistant_settings tool with toolId="core.security.alert_counts"\n2. Use the retrieved settings to call this tool to answer their question',
    },
  },
  {
    promptId: 'OpenAndAcknowledgedAlertsTool',
    promptGroupId: builtinPromptGroupId,
    prompt: {
      default:
        'Call this for knowledge about the latest n open and acknowledged alerts (sorted by `kibana.alert.risk_score`) in the environment, or when answering questions about open alerts. Do not call this tool for alert count or quantity. The output is an array of the latest n open and acknowledged alerts.\n\nWORKFLOW: This tool requires NO parameters. You MUST follow this exact sequence:\n1. First call the assistant_settings tool with toolId="core.security.open_and_acknowledged_alerts"\n2. Use the retrieved settings to call this tool to answer their question',
    },
  },
  {
    promptId: 'ProductDocumentationTool',
    promptGroupId: builtinPromptGroupId,
    prompt: {
      default:
        'Use this tool to retrieve official documentation about Elastic products and technologies. This includes the Elastic stack (Elasticsearch, Kibana, Logstash, Beats), Elastic solutions (Security, Observability, Enterprise Search), and related technologies like Painless scripting, EQL, ES|QL, and more. ALWAYS use this tool when users ask about Elastic technologies, features, syntax, or implementation details. Examples: "What is Elastic Painless?", "How do I use EQL?", "What are Elasticsearch aggregations?", "How to configure Kibana dashboards?".',
    },
  },
  {
    promptId: 'KnowledgeBaseRetrievalTool',
    promptGroupId: builtinPromptGroupId,
    prompt: {
      default: `Call this tool to fetch information from the user's knowledge base. The knowledge base contains useful details the user has saved between conversation contexts.

Use this tool **only in the following cases**:

1. When the user asks a question about their personal, organizational, saved, or previously provided information/knowledge, such as:
- "What was the detection rule I saved for unusual AWS API calls?"
- "Using my saved investigation notes, what did I find about the incident last Thursday?"
- "What are my preferred index patterns?"
- "What did I say about isolating hosts?"
- "What is my favorite coffee spot near the office?" *(non-security example)*

2. Always call this tool when the user's query includes phrases like:**
- "my favorite"
- "what did I say about"
- "my saved"
- "my notes"
- "my preferences"
- "using my"
- "what do I know about"
- "based on my saved knowledge"

3. When you need to retrieve saved information the user has stored in their knowledge base, whether it's security-related or not.

**Do NOT call this tool if**:
- The \`knowledge history\` section already answers the user's question.
- The user's query is about general knowledge not specific to their saved information.

**When calling this tool**:
- Provide only the user's free-text query as the input, rephrased if helpful to clarify the search intent.
- Format the input as a single, clean line of text.

Example:
- User query: "What did I note about isolating endpoints last week?"
- Tool input: "User notes about isolating endpoints."

If no relevant information is found, inform the user you could not locate the requested information.

**Important**:
- Always check the \`knowledge history\` section first for an answer.
- Only call this tool if the user's query is explicitly about their own saved data or preferences.`,
    },
  },
  {
    promptId: 'KnowledgeBaseWriteTool',
    promptGroupId: builtinPromptGroupId,
    prompt: {
      default:
        "Call this for writing details to the user's knowledge base. The knowledge base contains useful information the user wants to store between conversation contexts. Input will be the summarized knowledge base entry to store, a short UI friendly name for the entry, and whether or not the entry is required.",
    },
  },
  {
    promptId: 'SecurityLabsKnowledgeBaseTool',
    promptGroupId: builtinPromptGroupId,
    prompt: {
      default:
        'Call this for knowledge from Elastic Security Labs content, which contains information on malware, attack techniques, and more.',
    },
  },
  {
    promptId: 'EntityRiskScoreTool',
    promptGroupId: builtinPromptGroupId,
    prompt: {
      default:
        "Call this for knowledge about the latest entity risk score and the inputs that contributed to the calculation (sorted by 'kibana.alert.risk_score') in the environment, or when answering questions about how critical or risky an entity is. When informing the risk score value for a entity you must use the normalized field 'calculated_score_norm'.\n\nWORKFLOW: This tool requires identifier_type and identifier parameters. You MUST follow this exact sequence:\n1. First call the assistant_settings tool with toolId=\"core.security.entity_risk_score\"\n2. Use the retrieved settings to call this tool with the required parameters",
    },
  },
];
