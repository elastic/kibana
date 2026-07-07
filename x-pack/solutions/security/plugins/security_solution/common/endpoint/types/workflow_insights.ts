/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import { z } from '@kbn/zod/v4';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

/**
 * Single source of truth for all workflow insight enum values.
 * All schemas (Zod, kbn/config-schema, OpenAPI YAML) must match these lists.
 */

export const WORKFLOW_INSIGHT_TYPE_VALUES = [
  'incompatible_antivirus',
  'policy_response_failure',
  'custom',
] as const;

export const WORKFLOW_INSIGHT_CATEGORY_VALUES = ['endpoint'] as const;

export const WORKFLOW_INSIGHT_SOURCE_TYPE_VALUES = ['llm-connector'] as const;

export const WORKFLOW_INSIGHT_TARGET_TYPE_VALUES = ['endpoint'] as const;

export const WORKFLOW_INSIGHT_ACTION_TYPE_VALUES = [
  'refreshed',
  'remediated',
  'suppressed',
  'dismissed',
] as const;

export const WorkflowInsightType = z.enum(WORKFLOW_INSIGHT_TYPE_VALUES);
export type WorkflowInsightType = z.infer<typeof WorkflowInsightType>;

export const WorkflowInsightCategory = z.enum(WORKFLOW_INSIGHT_CATEGORY_VALUES);
export type WorkflowInsightCategory = z.infer<typeof WorkflowInsightCategory>;

export const WorkflowInsightSourceType = z.enum(WORKFLOW_INSIGHT_SOURCE_TYPE_VALUES);
export type WorkflowInsightSourceType = z.infer<typeof WorkflowInsightSourceType>;

export const WorkflowInsightTargetType = z.enum(WORKFLOW_INSIGHT_TARGET_TYPE_VALUES);
export type WorkflowInsightTargetType = z.infer<typeof WorkflowInsightTargetType>;

export const WorkflowInsightActionType = z.enum(WORKFLOW_INSIGHT_ACTION_TYPE_VALUES);
export type WorkflowInsightActionType = z.infer<typeof WorkflowInsightActionType>;

/**
 * DefendInsight is the raw insight produced by the LLM,
 * SecurityWorkflowInsight is the enriched final insight
 */
export interface DefendInsightEvent {
  id: string;
  endpointId: string;
  value: string;
}

export interface DefendInsight {
  group: string;
  events?: DefendInsightEvent[];
  remediation?: Record<string, unknown>;
}

export type DefendInsights = DefendInsight[];

export type ExceptionListRemediationType = Pick<
  ExceptionListItemSchema,
  'list_id' | 'name' | 'description' | 'entries' | 'tags' | 'os_types'
>;

export interface SecurityWorkflowInsight {
  id?: string;
  '@timestamp': Moment;
  message: string;
  category: WorkflowInsightCategory;
  type: WorkflowInsightType;
  source: {
    type: WorkflowInsightSourceType;
    id: string;
    data_range_start: Moment;
    data_range_end: Moment;
  };
  target: {
    type: WorkflowInsightTargetType;
    ids: string[];
  };
  action: {
    type: WorkflowInsightActionType;
    timestamp: Moment;
  };
  value: string;
  remediation: {
    exception_list_items?: ExceptionListRemediationType[];
    descriptive?: string; // text based explanation
    link?: string;
  };
  metadata: {
    notes?: Record<string, string>;
    message_variables?: string[];
    display_name?: string;
  };
}

export interface SearchParams {
  size?: number;
  from?: number;
  ids?: string[];
  categories?: WorkflowInsightCategory[];
  types?: WorkflowInsightType[];
  sourceTypes?: WorkflowInsightSourceType[];
  sourceIds?: string[];
  targetTypes?: WorkflowInsightTargetType[];
  targetIds?: string[];
  actionTypes?: WorkflowInsightActionType[];
}
