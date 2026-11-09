/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { WORKER_INVESTIGATION_ID_NAMESPACE } from '../../../common/constants';

/**
 * Fixed namespace UUID for Worker-per-subject Investigation conversation ids. Arbitrary
 * but frozen: changing it renames every existing Investigation, so a re-review would open
 * a second one next to the Investigation an earlier review left for the same subject.
 * Distinct from the Hunt Watch namespace, so a Hunt Investigation and a Worker
 * Investigation can never collide on an id.
 */
const WORKER_INVESTIGATION_UUID_NAMESPACE = 'c3b7d1f4-8a2e-5e6d-9f01-4b5a6c7d8e9f';

export interface WorkerInvestigationSubject {
  spaceId: string;
  /** Catalog id of the Worker whose review owns the Investigation. */
  workerId: string;
  /** What the review is about: a knowledge indicator id, a rule saved-object id. */
  subjectId: string;
}

/** Derives the one Investigation id a Worker's reviews of a subject share within a space. */
export const buildWorkerInvestigationConversationId = ({
  spaceId,
  workerId,
  subjectId,
}: WorkerInvestigationSubject): string =>
  uuidv5(
    `${WORKER_INVESTIGATION_ID_NAMESPACE}${spaceId}|${workerId}|${subjectId}`,
    WORKER_INVESTIGATION_UUID_NAMESPACE
  );
