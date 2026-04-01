/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import type { WorkflowIntegrityResult } from '@kbn/discoveries/impl/attack_discovery/generation/types';
import type {
  AllDefaultWorkflowKey,
  BundledYamlEntry,
  OptionalDefaultWorkflowKey,
  RequiredDefaultWorkflowKey,
} from '../../../workflows/helpers/get_bundled_yaml_entries';
import type { DefaultWorkflowIds } from '../../../workflows/register_default_workflows';

const REQUIRED_WORKFLOW_KEYS: ReadonlyArray<RequiredDefaultWorkflowKey> = [
  'default_alert_retrieval',
  'generation',
  'validate',
];

const OPTIONAL_WORKFLOW_KEYS: ReadonlyArray<OptionalDefaultWorkflowKey> = [
  'custom_validation_example',
  'esql_example_alert_retrieval',
  'run_example',
];

export interface VerifyAndRepairWorkflowsParams {
  bundledYamlEntries: ReadonlyMap<AllDefaultWorkflowKey, BundledYamlEntry>;
  defaultWorkflowIds: DefaultWorkflowIds;
  invalidateCache: (spaceId: string) => void;
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
  workflowsManagementApi: WorkflowsServerPluginSetup['management'];
}

interface WorkflowOutcome {
  key: AllDefaultWorkflowKey;
  repaired?: { key: AllDefaultWorkflowKey; workflowId: string };
  unrepairableError?: { error: string; key: AllDefaultWorkflowKey; workflowId: string };
}

/**
 * Checks a single workflow and repairs it if necessary.
 *
 * Decision tree (in order — ordering is load-bearing, see comments):
 *
 *   1. Missing / soft-deleted  → re-create from bundled YAML
 *   2. Invalid YAML or drifted → restore bundled YAML
 *      (MUST precede step 3: the Workflows API also sets enabled:false when YAML
 *       validation fails, so a workflow can be both invalid AND disabled. Re-enabling
 *       alone would leave the definition missing.)
 *   3. Disabled (valid YAML)   → re-enable only
 *   4. Intact                  → no action
 */
const checkWorkflow = async ({
  bundledYamlEntries,
  invalidateCache,
  key,
  kind,
  logger,
  request,
  spaceId,
  workflowId,
  workflowsManagementApi,
}: {
  bundledYamlEntries: ReadonlyMap<AllDefaultWorkflowKey, BundledYamlEntry>;
  invalidateCache: (spaceId: string) => void;
  key: AllDefaultWorkflowKey;
  kind: 'optional' | 'required';
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
  workflowId: string;
  workflowsManagementApi: WorkflowsServerPluginSetup['management'];
}): Promise<WorkflowOutcome> => {
  const bundledEntry = bundledYamlEntries.get(key);
  const abortSuffix = kind === 'required' ? ' Aborting generation.' : '';

  // G2: Use getWorkflowsByIds to exclude soft-deleted workflows
  const [storedWorkflow] = await workflowsManagementApi.getWorkflowsByIds([workflowId], spaceId);

  // 1. Missing or soft-deleted — attempt re-creation from bundled YAML.
  if (storedWorkflow == null) {
    const kindLabel = kind === 'required' ? 'Required' : 'Optional';
    const notFoundMessage = `${kindLabel} workflow '${workflowId}' (${key}) not found in space '${spaceId}'; attempting re-creation`;

    // Required missing is an error; optional missing is a warning (it won't block generation).
    if (kind === 'required') {
      logger.error(notFoundMessage);
    } else {
      logger.warn(notFoundMessage);
    }

    if (bundledEntry == null) {
      return {
        key,
        unrepairableError: {
          error: `Bundled YAML entry for '${key}' is unavailable; cannot re-create missing workflow`,
          key,
          workflowId,
        },
      };
    }

    try {
      const created = await workflowsManagementApi.createWorkflow(
        { yaml: bundledEntry.yaml },
        spaceId,
        request
      );
      invalidateCache(spaceId);
      return { key, repaired: { key, workflowId: created.id } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        `Failed to restore workflow '${workflowId}' (${key}): ${message}.${abortSuffix}`
      );
      return { key, unrepairableError: { error: message, key, workflowId } };
    }
  }

  // 2. Invalid YAML or hash drift — restore bundled definition.
  //    IMPORTANT: Must precede step 3 (enabled check). The Workflows API automatically
  //    sets enabled:false when YAML validation fails, so a workflow that has invalid
  //    YAML will also be disabled. Checking enabled first would cause re-enable-only
  //    repair, leaving the workflow with a missing definition on every subsequent run.
  const storedHash = createHash('sha256')
    .update(storedWorkflow.yaml?.trim() ?? '')
    .digest('hex');
  const hasHashDrift = bundledEntry != null && storedHash !== bundledEntry.hash;

  if (!storedWorkflow.valid || hasHashDrift) {
    if (bundledEntry == null) {
      logger.error(
        `Cannot repair invalid workflow '${workflowId}' (${key}): bundled YAML entry unavailable.${abortSuffix}`
      );
      return {
        key,
        unrepairableError: {
          error: `Bundled YAML entry for '${key}' is unavailable; cannot repair invalid workflow`,
          key,
          workflowId,
        },
      };
    }

    logger.info(
      `Workflow '${workflowId}' (${key}) has been modified; restoring bundled definition`
    );

    try {
      const result = await workflowsManagementApi.updateWorkflow(
        workflowId,
        { yaml: bundledEntry.yaml },
        spaceId,
        request
      );

      if (!result.valid) {
        const errorDetail =
          result.validationErrors != null && result.validationErrors.length > 0
            ? result.validationErrors.join('; ')
            : 'unknown validation error';
        logger.error(
          `Workflow '${workflowId}' (${key}) was updated but is still invalid after restoration: ${errorDetail}.${abortSuffix}`
        );
        return {
          key,
          unrepairableError: {
            error: `Workflow updated but still invalid after restoration: ${errorDetail}`,
            key,
            workflowId,
          },
        };
      }

      logger.info(`Successfully restored workflow '${workflowId}' (${key}) to bundled definition`);
      return { key, repaired: { key, workflowId } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        `Failed to restore workflow '${workflowId}' (${key}): ${message}.${abortSuffix}`
      );
      return { key, unrepairableError: { error: message, key, workflowId } };
    }
  }

  // 3. Valid YAML (hash matches), but disabled — re-enable only.
  if (!storedWorkflow.enabled) {
    logger.info(`Workflow '${workflowId}' (${key}) has been disabled; re-enabling`);

    try {
      await workflowsManagementApi.updateWorkflow(workflowId, { enabled: true }, spaceId, request);
      logger.info(`Successfully re-enabled workflow '${workflowId}' (${key})`);
      return { key, repaired: { key, workflowId } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        `Failed to re-enable workflow '${workflowId}' (${key}): ${message}.${abortSuffix}`
      );
      return { key, unrepairableError: { error: message, key, workflowId } };
    }
  }

  // 4. Intact — no action needed.
  return { key };
};

export const verifyAndRepairWorkflows = async ({
  bundledYamlEntries,
  defaultWorkflowIds,
  invalidateCache,
  logger,
  request,
  spaceId,
  workflowsManagementApi,
}: VerifyAndRepairWorkflowsParams): Promise<WorkflowIntegrityResult> => {
  const requiredOutcomes = await Promise.all(
    REQUIRED_WORKFLOW_KEYS.map((key) =>
      checkWorkflow({
        bundledYamlEntries,
        invalidateCache,
        key,
        kind: 'required',
        logger,
        request,
        spaceId,
        workflowId: defaultWorkflowIds[key],
        workflowsManagementApi,
      })
    )
  );

  // Check optional workflows — skip those with no provisioned ID
  const optionalOutcomes = await Promise.all(
    OPTIONAL_WORKFLOW_KEYS.flatMap((key) => {
      const workflowId = defaultWorkflowIds[key];
      if (workflowId == null) {
        return [];
      }
      return [
        checkWorkflow({
          bundledYamlEntries,
          invalidateCache,
          key,
          kind: 'optional',
          logger,
          request,
          spaceId,
          workflowId,
          workflowsManagementApi,
        }),
      ];
    })
  );

  const repaired = requiredOutcomes.flatMap((o) =>
    o.repaired != null
      ? [o.repaired as { key: RequiredDefaultWorkflowKey; workflowId: string }]
      : []
  );

  const unrepairableErrors = requiredOutcomes.flatMap((o) =>
    o.unrepairableError != null
      ? [
          o.unrepairableError as {
            error: string;
            key: RequiredDefaultWorkflowKey;
            workflowId: string;
          },
        ]
      : []
  );

  const optionalRepaired = optionalOutcomes.flatMap((o) =>
    o.repaired != null
      ? [o.repaired as { key: OptionalDefaultWorkflowKey; workflowId: string }]
      : []
  );

  const optionalWarnings = optionalOutcomes.flatMap((o) =>
    o.unrepairableError != null
      ? [
          o.unrepairableError as {
            error: string;
            key: OptionalDefaultWorkflowKey;
            workflowId: string;
          },
        ]
      : []
  );

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

  logger.debug(() => `All required workflows intact for space '${spaceId}'`);
  return { optionalRepaired, optionalWarnings, repaired, status: 'all_intact', unrepairableErrors };
};
