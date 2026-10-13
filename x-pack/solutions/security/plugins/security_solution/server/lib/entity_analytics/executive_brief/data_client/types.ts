/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefJob,
  BriefMetadata,
  BriefReport,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';

/** One document per user profile and space; `report` and `metadata` hold the last successful run. */
export interface BriefDocument {
  /** The owner's user profile id. */
  owner: { id: string };
  spaceId: string;
  schemaVersion: 1;
  job: BriefJob;
  report?: BriefReport;
  metadata?: BriefMetadata;
}

/** The caller's brief: one per user profile and space. */
export interface BriefOwner {
  profileId: string;
  spaceId: string;
}

/** A change to a job; `report` and `metadata` are only set when it succeeds. */
export interface JobUpdate {
  job: Partial<Pick<BriefJob, 'status' | 'stage' | 'error'>>;
  report?: BriefReport;
  metadata?: BriefMetadata;
}
