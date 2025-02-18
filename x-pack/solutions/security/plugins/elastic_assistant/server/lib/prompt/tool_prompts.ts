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
      default:
        "Call this for fetching details from the user's knowledge base. The knowledge base contains useful information the user wants to store between conversation contexts. Call this function when the user asks for information about themself, like 'what is my favorite...' or 'using my saved....'. Input must always be the free-text query on a single line, with no other text. You are welcome to re-write the query to be a summary of items/things to search for in the knowledge base, as a vector search will be performed to return similar results when requested. If the results returned do not look relevant, disregard and tell the user you were unable to find the information they were looking for. All requests include a `knowledge history` section which includes some existing knowledge of the user. DO NOT CALL THIS FUNCTION if the `knowledge history` sections appears to be able to answer the user's query.",
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
