/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Prompt } from '@kbn/security-ai-prompts';

export const promptGroupId = 'security-tools';

// promptId must match tool name
// cannot import from security_solution because it causes a circular dependency
export const localToolPrompts: Prompt[] = [
  {
    promptId: 'AlertCountsTool',
    promptGroupId,
    prompt: {
      default:
        'Call this for the counts of last 24 hours of open and acknowledged alerts in the environment, grouped by their severity and workflow status. The response will be JSON and from it you can summarize the information to answer the question.',
    },
  },
  {
    promptId: 'NaturalLanguageESQLTool',
    promptGroupId,
    prompt: {
      default: `You MUST use the "NaturalLanguageESQLTool" function when the user wants to:
  - breakdown or filter ES|QL queries that are displayed on the current page
  - convert queries from another language to ES|QL
  - asks general questions about ES|QL
  ALWAYS use this tool to generate ES|QL queries or explain anything about the ES|QL query language rather than coming up with your own answer.`,
    },
  },
  {
    promptId: 'GenerateESQLTool',
    promptGroupId,
    prompt: {
      default: `You MUST use the "GenerateESQLTool" function when the user wants to:
- generate an ES|QL query
- convert queries from another language to ES|QL they can run on their cluster

ALWAYS use this tool to generate ES|QL queries and never generate ES|QL any other way.`,
    },
  },
  {
    promptId: 'AskAboutEsqlTool',
    promptGroupId,
    prompt: {
      default: `You MUST use the "AskAboutEsqlTool" function when the user:
- asks for help with ES|QL
- asks about ES|QL syntax
- asks for ES|QL examples
- asks for ES|QL documentation
- asks for ES|QL best practices
- asks for ES|QL optimization

Never use this tool when they user wants to generate a ES|QL for their data.`,
    },
  },

  {
    promptId: 'ProductDocumentationTool',
    promptGroupId,
    prompt: {
      default:
        'Use this tool to retrieve documentation about Elastic products. You can retrieve documentation about the Elastic stack, such as Kibana and Elasticsearch, or for Elastic solutions, such as Elastic Security, Elastic Observability or Elastic Enterprise Search.',
    },
  },
  {
    promptId: 'KnowledgeBaseRetrievalTool',
    promptGroupId,
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
    promptGroupId,
    prompt: {
      default:
        "Call this for writing details to the user's knowledge base. The knowledge base contains useful information the user wants to store between conversation contexts. Input will be the summarized knowledge base entry to store, a short UI friendly name for the entry, and whether or not the entry is required.",
    },
  },
  {
    promptId: 'SecurityLabsKnowledgeBaseTool',
    promptGroupId,
    prompt: {
      default:
        'Call this for knowledge from Elastic Security Labs content, which contains information on malware, attack techniques, and more.',
    },
  },
  {
    promptId: 'OpenAndAcknowledgedAlertsTool',
    promptGroupId,
    prompt: {
      default:
        'Call this for knowledge about the latest n open and acknowledged alerts (sorted by `kibana.alert.risk_score`) in the environment, or when answering questions about open alerts. Do not call this tool for alert count or quantity. The output is an array of the latest n open and acknowledged alerts.',
    },
  },
  {
    promptId: 'defendInsightsTool',
    promptGroupId,
    prompt: {
      default: 'Call this for Elastic Defend insights.',
    },
  },
];
