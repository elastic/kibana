/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefJobView,
  BriefResponse,
} from '../../../../../common/entity_analytics/executive_brief/api';
import type {
  BriefDocument,
  BriefJob,
} from '../../../../../common/entity_analytics/executive_brief/document';

/** Maps a stored job to the job view shown by the GET routes. */
export const toJobView = (job: BriefJob): BriefJobView => ({
  id: job.id,
  status: job.status,
  ...(job.status === 'running' && job.stage ? { stage: job.stage } : {}),
  startedAt: job.started_at,
  updatedAt: job.heartbeat_at ?? job.started_at,
  ...(job.status === 'failed' && job.error ? { error: job.error } : {}),
});

/** Maps the stored document to the GET response: the latest job, the report and its metadata. */
export const toBriefResponse = (document: BriefDocument): BriefResponse => {
  const job = toJobView(document.job);
  const { generated_at: generatedAt, params, evidence, brief } = document;
  if (!generatedAt || !params || !evidence) {
    return { job };
  }
  return {
    job,
    report: {
      ...(brief ? { verdict: brief.verdict, areas: brief.areas } : {}),
      entities: evidence.entities,
      facts: evidence.facts,
      links: evidence.links,
    },
    metadata: {
      generatedAt,
      expiresAt: document.expires_at,
      period: { range: params.range, from: params.from, to: params.to },
      connectorId: params.connector_id,
      ...(document.model ? { model: document.model } : {}),
      ...(document.tokens ? { tokens: document.tokens } : {}),
      ...(document.verification ? { verification: document.verification } : {}),
      signals: evidence.signals,
    },
  };
};
