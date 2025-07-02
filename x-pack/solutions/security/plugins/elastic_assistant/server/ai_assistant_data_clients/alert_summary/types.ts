/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsReplacementSchema } from '../conversations/types';

export interface EsAlertSummarySchema {
  id: string;
  alert_id: string;
  '@timestamp': string;
  created_at: string;
  created_by: string;
  summary: string;
  recommended_actions?: string;
  replacements: EsReplacementSchema[];
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  updated_at?: string;
  updated_by?: string;
  namespace: string;
}

export interface UpdateAlertSummarySchema {
  id: string;
  '@timestamp'?: string;
  summary?: string;
  recommended_actions?: string;
  replacements?: EsReplacementSchema[];
  updated_at?: string;
  updated_by?: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
}

export interface CreateAlertSummarySchema {
  '@timestamp'?: string;
  alert_id: string;
  summary: string;
  replacements: EsReplacementSchema[];
  recommended_actions?: string;
  updated_at?: string;
  updated_by?: string;
  created_at?: string;
  created_by?: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
}
