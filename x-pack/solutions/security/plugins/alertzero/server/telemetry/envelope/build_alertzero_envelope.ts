/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import type { AlertZeroEnvelope } from '../event_types';
import { deriveAutonomyMode } from './derive_autonomy_mode';
import { resolveAutonomyLevel } from './resolve_autonomy_level';
import { resolveTriggerType } from './resolve_trigger_type';
import { resolveWorkerCatalogFields } from './resolve_worker_catalog_fields';
import { usesConfiguredAutonomy } from './uses_configured_autonomy';

/**
 * The persisted root execution of a Worker run: the fields the envelope reads. A
 * `WorkflowExecutionDto` from the management API satisfies it as-is.
 */
export type AlertZeroEnvelopeRoot = Pick<
  WorkflowExecutionDto,
  'context' | 'id' | 'originManagedWorkflowId' | 'spaceId' | 'triggeredBy'
> & {
  workflowDefinition?: Pick<WorkflowYaml, 'consts'> | null;
};

export interface BuildAlertZeroEnvelopeParams {
  /** The execution reporting the event, which may be a descendant of the root. */
  executionId: string;
  root: AlertZeroEnvelopeRoot;
}

/**
 * Builds the shared AlertZero event envelope from a Worker run's root execution. Every field comes
 * from persisted server state; nothing is read from workflow inputs or the step context. The
 * autonomy fields are left out when the run does not act at the Worker's configured autonomy.
 */
export const buildAlertZeroEnvelope = ({
  executionId,
  root,
}: BuildAlertZeroEnvelopeParams): AlertZeroEnvelope => {
  const catalogFields = resolveWorkerCatalogFields(root.originManagedWorkflowId);
  const triggerType = resolveTriggerType(root);
  const autonomyLevel = usesConfiguredAutonomy({ triggerType, workerId: catalogFields.worker_id })
    ? resolveAutonomyLevel(root.workflowDefinition?.consts)
    : undefined;
  return {
    ...catalogFields,
    ...(autonomyLevel
      ? { autonomy_level: autonomyLevel, autonomy_mode: deriveAutonomyMode(autonomyLevel) }
      : {}),
    execution_id: executionId,
    is_default_space: root.spaceId === DEFAULT_SPACE_ID,
    run_id: root.id,
    trigger_type: triggerType,
  };
};
