/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';

import type { DefendInsightType } from '@kbn/elastic-assistant-common';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export enum Category {
  Endpoint = 'endpoint',
}

export enum SourceType {
  LlmConnector = 'llm-connector',
}

export enum TargetType {
  Endpoint = 'endpoint',
}

export enum ActionType {
  Refreshed = 'refreshed', // new or refreshed
  Remediated = 'remediated',
  Suppressed = 'suppressed', // temporarily supressed, can be refreshed
  Dismissed = 'dismissed', // "permanently" dismissed, cannot be normally refreshed
}

export type ExceptionListRemediationType = Pick<
  ExceptionListItemSchema,
  'list_id' | 'name' | 'description' | 'entries' | 'tags' | 'os_types'
>;

export interface SecurityWorkflowInsight {
  id?: string;
  '@timestamp': Moment;
  message: string;
  category: Category;
  type: DefendInsightType;
  source: {
    type: SourceType;
    id: string;
    data_range_start: Moment;
    data_range_end: Moment;
  };
  target: {
    type: TargetType;
    ids: string[];
  };
  action: {
    type: ActionType;
    timestamp: Moment;
  };
  value: string;
  remediation: {
    exception_list_items?: ExceptionListRemediationType[];
  };
  metadata: {
    notes?: Record<string, string>;
    message_variables?: string[];
  };
}

export interface SearchParams {
  size?: number;
  from?: number;
  ids?: string[];
  categories?: Category[];
  types?: DefendInsightType[];
  sourceTypes?: SourceType[];
  sourceIds?: string[];
  targetTypes?: TargetType[];
  targetIds?: string[];
  actionTypes?: ActionType[];
}
