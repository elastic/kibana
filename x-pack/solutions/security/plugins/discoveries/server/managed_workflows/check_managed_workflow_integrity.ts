/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type {
  OptionalDefaultWorkflowKey,
  RequiredDefaultWorkflowKey,
  WorkflowIntegrityResult,
} from '@kbn/discoveries/impl/attack_discovery/generation/types';
import { reportMisconfiguration } from '@kbn/discoveries/impl/lib/telemetry/report_misconfiguration';
import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import type { ManagedWorkflowId } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

export interface CheckManagedWorkflowIntegrityParams {
  analytics?: AnalyticsServiceSetup;
  logger: Logger;
  spaceId: string;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

const BUILT_IN_STEP_PREFIXES = ['data.', 'elasticsearch.', 'kibana.', 'workflow.'] as const;

const isBuiltInStepType = (stepType: string): boolean =>
  !stepType.includes('.') || BUILT_IN_STEP_PREFIXES.some((prefix) => stepType.startsWith(prefix));

const collectStepTypes = (steps: unknown[]): string[] => {
  const types: string[] = [];
  for (const step of steps) {
    if (step != null && typeof step === 'object') {
      const s = step as Record<string, unknown>;
      if (typeof s.type === 'string') {
        types.push(s.type);
      }
      if (Array.isArray(s.steps)) {
        types.push(...collectStepTypes(s.steps as unknown[]));
      }
    }
  }
  return types;
};

const getUnregisteredStepType = (
  workflowId: string,
  workflowsExtensions: WorkflowsExtensionsServerPluginStart
): string | null => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition?.yaml) return null;

  const parsed = parse(definition.yaml) as Record<string, unknown> | null;
  const steps = Array.isArray(parsed?.steps) ? (parsed.steps as unknown[]) : [];

  for (const stepType of collectStepTypes(steps)) {
    if (!isBuiltInStepType(stepType) && !workflowsExtensions.hasStepDefinition(stepType)) {
      return stepType;
    }
  }
  return null;
};

const REQUIRED_ENTRIES: ReadonlyArray<{ id: ManagedWorkflowId; key: RequiredDefaultWorkflowKey }> =
  [
    { id: ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID, key: 'default_alert_retrieval' },
    { id: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID, key: 'generation' },
    { id: ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID, key: 'validate' },
  ];

const OPTIONAL_ENTRIES: ReadonlyArray<{ id: ManagedWorkflowId; key: OptionalDefaultWorkflowKey }> =
  [
    { id: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID, key: 'run_example' },
    {
      id: ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
      key: 'custom_validation_example',
    },
  ];

export const checkManagedWorkflowIntegrity = async ({
  analytics,
  logger,
  spaceId,
  workflowsExtensions,
}: CheckManagedWorkflowIntegrityParams): Promise<WorkflowIntegrityResult> => {
  const managed = await workflowsExtensions.initManagedWorkflowsClient('discoveries');

  const requiredOutcomes = await Promise.all(
    REQUIRED_ENTRIES.map(async ({ id, key }) => {
      const report = await managed.getWorkflowStatus(id, { spaceId });

      switch (report.status) {
        case 'missing':
          logger.error(`Required AD workflow '${id}' (${key}) not found in space '${spaceId}'`);
          return {
            key,
            unrepairableError: {
              error: `Workflow '${id}' not found`,
              key,
              workflowId: id,
            },
          };

        case 'not_managed':
          logger.error(
            `Required AD workflow '${id}' (${key}) is not managed in space '${spaceId}'`
          );
          return {
            key,
            unrepairableError: {
              error: `Workflow '${id}' is not managed`,
              key,
              workflowId: id,
            },
          };

        case 'invalid':
          logger.error(
            `Required AD workflow '${id}' (${key}) has an invalid definition in space '${spaceId}'`
          );
          return {
            key,
            unrepairableError: {
              error: `Workflow '${id}' has an invalid definition`,
              key,
              workflowId: id,
            },
          };

        case 'disabled':
          logger.error(`Required AD workflow '${id}' (${key}) is disabled in space '${spaceId}'`);
          return {
            key,
            unrepairableError: {
              error: `Workflow '${id}' is disabled`,
              key,
              workflowId: id,
            },
          };

        case 'drifted':
          logger.debug(
            () =>
              `AD workflow '${id}' (${key}) has an outdated definition in space '${spaceId}'; platform will reconcile on next restart`
          );
          return {
            key,
            repaired: { key, workflowId: id },
          };

        case 'intact':
        default: {
          const unregisteredType = getUnregisteredStepType(id, workflowsExtensions);
          if (unregisteredType != null) {
            const error = `Workflow '${id}' references unregistered step type '${unregisteredType}'; ensure the discoveries plugin is enabled in this Kibana instance`;
            logger.error(error);
            return {
              key,
              unrepairableError: { error, key, workflowId: id },
            };
          }
          return { key };
        }
      }
    })
  );

  const optionalOutcomes = await Promise.all(
    OPTIONAL_ENTRIES.map(async ({ id, key }) => {
      const report = await managed.getWorkflowStatus(id, { spaceId });

      switch (report.status) {
        case 'missing':
          logger.warn(`Optional AD workflow '${id}' (${key}) not found in space '${spaceId}'`);
          return {
            key,
            optionalWarning: {
              error: `Workflow '${id}' not found`,
              key,
              workflowId: id,
            },
          };

        case 'not_managed':
          logger.warn(`Optional AD workflow '${id}' (${key}) is not managed in space '${spaceId}'`);
          return {
            key,
            optionalWarning: {
              error: `Workflow '${id}' is not managed`,
              key,
              workflowId: id,
            },
          };

        case 'invalid':
          logger.warn(
            `Optional AD workflow '${id}' (${key}) has an invalid definition in space '${spaceId}'`
          );
          return {
            key,
            optionalWarning: {
              error: `Workflow '${id}' has an invalid definition`,
              key,
              workflowId: id,
            },
          };

        case 'disabled':
          logger.warn(`Optional AD workflow '${id}' (${key}) is disabled in space '${spaceId}'`);
          return {
            key,
            optionalWarning: {
              error: `Workflow '${id}' is disabled`,
              key,
              workflowId: id,
            },
          };

        case 'drifted':
          logger.debug(
            () =>
              `Optional AD workflow '${id}' (${key}) has an outdated definition in space '${spaceId}'`
          );
          return {
            key,
            optionalRepaired: { key, workflowId: id },
          };

        case 'intact':
        default:
          return { key };
      }
    })
  );

  const repaired = requiredOutcomes.flatMap((outcome) =>
    'repaired' in outcome && outcome.repaired != null
      ? [outcome.repaired as { key: RequiredDefaultWorkflowKey; workflowId: string }]
      : []
  );

  const unrepairableErrors = requiredOutcomes.flatMap((outcome) =>
    'unrepairableError' in outcome && outcome.unrepairableError != null
      ? [
          outcome.unrepairableError as {
            error: string;
            key: RequiredDefaultWorkflowKey;
            workflowId: string;
          },
        ]
      : []
  );

  const optionalRepaired = optionalOutcomes.flatMap((outcome) =>
    'optionalRepaired' in outcome && outcome.optionalRepaired != null
      ? [outcome.optionalRepaired as { key: OptionalDefaultWorkflowKey; workflowId: string }]
      : []
  );

  const optionalWarnings = optionalOutcomes.flatMap((outcome) =>
    'optionalWarning' in outcome && outcome.optionalWarning != null
      ? [
          outcome.optionalWarning as {
            error: string;
            key: OptionalDefaultWorkflowKey;
            workflowId: string;
          },
        ]
      : []
  );

  if (analytics != null) {
    for (const { key, workflowId } of repaired) {
      reportMisconfiguration({
        analytics,
        logger,
        params: {
          detail: `Managed workflow '${workflowId}' (${key}) has drifted from its registered definition; platform will reconcile on next restart`,
          misconfiguration_type: 'workflow_modified',
          space_id: spaceId,
          workflow_id: workflowId,
        },
      });
    }

    for (const { key, workflowId } of optionalRepaired) {
      reportMisconfiguration({
        analytics,
        logger,
        params: {
          detail: `Optional managed workflow '${workflowId}' (${key}) has drifted from its registered definition; platform will reconcile on next restart`,
          misconfiguration_type: 'workflow_modified',
          space_id: spaceId,
          workflow_id: workflowId,
        },
      });
    }
  }

  if (unrepairableErrors.length > 0) {
    return {
      optionalRepaired,
      optionalWarnings,
      repaired,
      status: 'repair_failed',
      unrepairableErrors,
    };
  }

  if (repaired.length > 0) {
    return { optionalRepaired, optionalWarnings, repaired, status: 'repaired', unrepairableErrors };
  }

  logger.debug(() => `All required AD managed workflows intact in space '${spaceId}'`);
  return { optionalRepaired, optionalWarnings, repaired, status: 'all_intact', unrepairableErrors };
};
