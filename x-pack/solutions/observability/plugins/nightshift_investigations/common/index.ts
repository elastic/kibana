/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InvestigationSubjectType = 'significant_event' | 'alert';

export interface InvestigationSubject {
  type: InvestigationSubjectType;
  id: string;
}

export interface InvestigationContext {
  [key: string]: unknown;
}

export interface StartInvestigationRequest {
  subject: InvestigationSubject;
  /**
   * Caller-supplied key for concurrency control. Passed to the workflow engine as
   * `concurrency_key`, which maps to `concurrencyGroupKey` in the execution index.
   * Two starts with the same key cancel-and-replace the in-flight run (cancel-in-progress
   * strategy). Use a stable, unique caller-side ID — e.g. the alert _id or event UUID.
   */
  concurrency_key?: string;
  context?: InvestigationContext;
}

export interface StartInvestigationResponse {
  investigation_id: string;
}

export type InvestigationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface GetInvestigationResponse {
  investigation_id: string;
  subject: InvestigationSubject;
  status: InvestigationStatus;
  started_at?: string;
  completed_at?: string;
  conclusions?: string;
  error?: string;
}
