/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation lands in PR10 (Schedule Integration).
// PR3 callers pass `(request.body, existingSchedule.params.workflowConfig)`;
// the second arg is the existing workflow config, used for partial-merge
// semantics in the real impl. Stub accepts and discards it.
import type { AttackDiscoveryScheduleUpdateProps } from '@kbn/elastic-assistant-common';

export const transformUpdatePropsFromApi = (
  apiProps: unknown,
  _existingWorkflowConfig?: unknown
): AttackDiscoveryScheduleUpdateProps => (apiProps ?? {}) as AttackDiscoveryScheduleUpdateProps;
