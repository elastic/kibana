/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigationStatus,
  InvestigationStructuredOutput,
  InvestigationSubjectType,
  InvestigationTriggerType,
  PaginatedResponse,
  Severity,
} from '../../common';

export interface InvestigationAdmission {
  idempotency_key: string;
  /**
   * Absent between the moment the admission is reserved and the moment its workflow run starts.
   * The reservation is what makes admission idempotent across a redelivery that arrives while the
   * first one is still starting its run.
   */
  execution_id?: string;
}

export interface InvestigationReplyTarget {
  surface: 'slack';
  tenant_key: string;
  channel: string;
  thread_ts: string;
  /** Bot message to update for later successful rounds. Absent until the first post succeeds. */
  message_ts?: string;
}

export interface InvestigationAttributes extends InvestigationStructuredOutput {
  title: string;
  status: InvestigationStatus;
  subject_type: InvestigationSubjectType;
  subject_id: string;
  subject_summary?: string;
  trigger_type: InvestigationTriggerType;
  concurrency_key?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  executed_by?: string;
  error?: string;
  conversation_id?: string;
  latest_execution_id?: string;
  source_keys?: string[];
  admissions?: InvestigationAdmission[];
  reply_target?: InvestigationReplyTarget;
}

export interface InvestigationRecord extends InvestigationAttributes {
  id: string;
  version?: string;
}

/** An investigation with only `Fields` loaded. `id` and `version` are always present. */
export type ProjectedInvestigationRecord<Fields extends keyof InvestigationAttributes> = Pick<
  InvestigationAttributes,
  Fields
> & {
  id: string;
  version?: string;
};

export interface InvestigationPatch extends InvestigationStructuredOutput {
  title?: string;
  status?: InvestigationStatus;
  started_at?: string;
  completed_at?: string;
  executed_by?: string;
  error?: string;
  conversation_id?: string;
  latest_execution_id?: string;
  source_keys?: string[];
  admissions?: InvestigationAdmission[];
  reply_target?: InvestigationReplyTarget;
}

export interface FindInvestigationsQuery<
  Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
> {
  statuses?: InvestigationStatus[];
  subjectTypes?: InvestigationSubjectType[];
  severities?: Severity[];
  /**
   * Full-text query across title, subject_summary, summary, and conclusion.
   * Passed as `search` + `searchFields` to the SO find API, not as part of the KQL filter.
   */
  query?: string;
  concurrencyKey?: string;
  sourceKey?: string;
  createdAfter?: string;
  createdBefore?: string;
  startedAfter?: string;
  startedBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
  sortField?: 'created_at' | 'completed_at' | 'severity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
  fields?: Fields[];
}

export type FindInvestigationsResult<
  Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
> = PaginatedResponse<ProjectedInvestigationRecord<Fields>>;

export interface InvestigationRepository {
  create(params: { id: string; attributes: InvestigationAttributes }): Promise<void>;
  get(id: string): Promise<InvestigationRecord | undefined>;
  update(params: { id: string; patch: InvestigationPatch; version?: string }): Promise<void>;
  find<Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes>(
    query: FindInvestigationsQuery<Fields>
  ): Promise<FindInvestigationsResult<Fields>>;
}

export type FindInvestigationsAcrossSpacesResult<
  Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
> = PaginatedResponse<{ investigation: ProjectedInvestigationRecord<Fields>; spaceId: string }>;

/**
 * Reads and writes investigations in every space at once, for background work that runs without a
 * request and therefore cannot be scoped to one space the way {@link InvestigationRepository} is.
 */
export interface InvestigationSweepRepository {
  findAcrossSpaces<Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes>(
    query: FindInvestigationsQuery<Fields>
  ): Promise<FindInvestigationsAcrossSpacesResult<Fields>>;
  updateInSpace(params: {
    id: string;
    spaceId: string;
    patch: InvestigationPatch;
    version?: string;
  }): Promise<void>;
}
