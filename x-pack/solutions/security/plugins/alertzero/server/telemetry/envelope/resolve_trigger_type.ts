/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WellKnownWorkflowTriggerSource, WorkflowExecutionDto } from '@kbn/workflows';
import {
  isEventDrivenWorkflowTriggerSource,
  isWellKnownWorkflowTriggerSource,
} from '@kbn/workflows';
import type { AlertZeroTriggerType } from '../constants';

const WELL_KNOWN_TRIGGER_TYPES: Record<WellKnownWorkflowTriggerSource, AlertZeroTriggerType> = {
  alert: 'alert',
  manual: 'manual',
  scheduled: 'scheduled',
  'workflow-step': 'workflow_step',
};

/**
 * Classifies how a root execution started from its persisted `triggeredBy`. A registered trigger
 * id counts as `event` only with the engine's own dispatch evidence on the persisted execution;
 * any other string is a custom provenance value, shipped as `other`.
 */
export const resolveTriggerType = ({
  context,
  triggeredBy,
}: Pick<WorkflowExecutionDto, 'context' | 'triggeredBy'>): AlertZeroTriggerType => {
  if (triggeredBy == null || triggeredBy.length === 0) {
    return 'unknown';
  }
  if (isWellKnownWorkflowTriggerSource(triggeredBy)) {
    return WELL_KNOWN_TRIGGER_TYPES[triggeredBy];
  }
  return isEventDrivenWorkflowTriggerSource({ context, triggeredBy }) ? 'event' : 'other';
};
