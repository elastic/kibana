/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Prompt } from '@kbn/security-ai-prompts';
import { KNOWLEDGE_BASE_WRITE_TOOL } from '../knowledge_base/knowledge_base_write_tool';
import { NL_TO_ESQL_TOOL } from '../esql/nl_to_esql_tool';
import { PRODUCT_DOCUMENTATION_TOOL } from '../product_docs/product_documentation_tool';
import { KNOWLEDGE_BASE_RETRIEVAL_TOOL } from '../knowledge_base/knowledge_base_retrieval_tool';
import { SECURITY_LABS_KNOWLEDGE_BASE_TOOL } from '../security_labs/security_labs_tool';
import { OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL } from '../open_and_acknowledged_alerts/open_and_acknowledged_alerts_tool';
import { ALERT_COUNTS_TOOL } from './alert_counts_tool';
import { DEFEND_INSIGHTS_TOOL } from '../defend_insights';

export const promptGroupId = 'security-tools';

export const localToolPrompts: Prompt[] = [
  {
    promptId: ALERT_COUNTS_TOOL.name,
    promptGroupId,
    prompt: {
      default: ALERT_COUNTS_TOOL.description,
    },
  },
  {
    promptId: NL_TO_ESQL_TOOL.name,
    promptGroupId,
    prompt: {
      default: NL_TO_ESQL_TOOL.description,
    },
  },
  {
    promptId: PRODUCT_DOCUMENTATION_TOOL.name,
    promptGroupId,
    prompt: {
      default: PRODUCT_DOCUMENTATION_TOOL.description,
    },
  },
  {
    promptId: KNOWLEDGE_BASE_RETRIEVAL_TOOL.name,
    promptGroupId,
    prompt: {
      default: KNOWLEDGE_BASE_RETRIEVAL_TOOL.description,
    },
  },
  {
    promptId: KNOWLEDGE_BASE_WRITE_TOOL.name,
    promptGroupId,
    prompt: {
      default: KNOWLEDGE_BASE_WRITE_TOOL.description,
    },
  },
  {
    promptId: SECURITY_LABS_KNOWLEDGE_BASE_TOOL.name,
    promptGroupId,
    prompt: {
      default: SECURITY_LABS_KNOWLEDGE_BASE_TOOL.description,
    },
  },
  {
    promptId: OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL.name,
    promptGroupId,
    prompt: {
      default: OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL.description,
    },
  },
  {
    promptId: DEFEND_INSIGHTS_TOOL.name,
    promptGroupId,
    prompt: {
      default: DEFEND_INSIGHTS_TOOL.description,
    },
  },
];
