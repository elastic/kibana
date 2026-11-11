/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, boomify, conflict, isBoom, serverUnavailable } from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { isLockAcquisitionError, type LockManagerService } from '@kbn/lock-manager';
import type { AutomationBackingWorkflow } from '../../../common/automation_workflow';
import type { GetAutomationsSoClient, GetWorkflowsManagement } from '../../routes/types';
import type { InvestigatorServiceAccountService } from '../service_account/investigator_service_account';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import { automationCompletionSchema } from './schemas';
import { generateWorkflowYaml } from './generate_workflow_yaml';
import { validateScheduledAutomation } from './validate_scheduled_automation';
import type { NightshiftAutomationAttributes, NightshiftAutomationRecord } from './types';
import type { AutomationUpdate } from './automation_update';

interface Dependencies {
  getAutomationsSoClient: GetAutomationsSoClient;
  getWorkflowsManagement: GetWorkflowsManagement;
  getInvestigatorServiceAccountService: () => Pick<
    InvestigatorServiceAccountService,
    'resolveAutomationRunAs'
  >;
  isUniversalAlertingAvailable: () => boolean;
  lockManager: Pick<LockManagerService, 'withLock' | 'getLock'>;
  logger: Pick<Logger, 'warn' | 'info'>;
}

const applyChanges = <T extends object>(
  current: T,
  changes: { [K in keyof T]?: T[K] | null }
): T => {
  const updated = { ...current };
  Object.entries(changes).forEach(([key, value]) => {
    if (value !== undefined) Object.assign(updated, { [key]: value ?? undefined });
  });
  return updated;
};

/** Reconciles generated workflows against authorized automation configuration. */
export const createAutomationWorkflowService = ({
  getAutomationsSoClient,
  getWorkflowsManagement,
  getInvestigatorServiceAccountService,
  isUniversalAlertingAvailable,
  lockManager,
  logger,
}: Dependencies) => {
  const management = () => {
    const workflows = getWorkflowsManagement();
    if (!workflows) throw serverUnavailable('Workflows management is not available');
    return workflows.management;
  };

  const withLock = async <T>(
    spaceId: string,
    id: string,
    callback: () => Promise<T>
  ): Promise<T> => {
    try {
      return await lockManager.withLock(`nightshift-automation:${spaceId}:${id}`, callback);
    } catch (error) {
      if (isLockAcquisitionError(error)) {
        throw conflict('This automation is being changed. Refresh and try again.');
      }
      if (
        error instanceof Error &&
        !isBoom(error) &&
        'statusCode' in error &&
        typeof error.statusCode === 'number' &&
        Number.isInteger(error.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode <= 599
      ) {
        throw boomify(error, { statusCode: error.statusCode });
      }
      throw error;
    }
  };

  const readStates = (ids: string[], spaceId: string) =>
    management().getWorkflowStates(ids, spaceId);

  const getStates = async (
    automations: Array<Pick<NightshiftAutomationRecord, 'id' | 'workflowId' | 'isEnabled'>>,
    spaceId: string
  ): Promise<Map<string, AutomationBackingWorkflow>> => {
    try {
      const states = await readStates(
        automations.flatMap(({ workflowId }) => (workflowId ? [workflowId] : [])),
        spaceId
      );
      const byId = new Map(states.map((state) => [state.id, state]));
      return new Map(
        await Promise.all(
          automations.map(async ({ id, workflowId, isEnabled }) => {
            const workflow = workflowId ? byId.get(workflowId) : undefined;
            let state: AutomationBackingWorkflow['state'] = !workflow
              ? 'missing'
              : workflow.enabled === isEnabled
              ? 'available'
              : 'out_of_sync';
            if (state !== 'available') {
              const lock = await lockManager.getLock(`nightshift-automation:${spaceId}:${id}`);
              if (lock) state = 'updating';
            }
            return [id, { state }] as const;
          })
        )
      );
    } catch (error) {
      logger.warn(`Could not verify automation workflows in space ${spaceId}`);
      return new Map(automations.map(({ id }) => [id, { state: 'unknown' }]));
    }
  };

  const assertStateAvailable = (state: AutomationBackingWorkflow['state'] | undefined): void => {
    if (state === 'available') return;
    if (state === 'updating') {
      throw conflict('This automation is being changed. Refresh and try again.');
    }
    if (state === 'unknown' || !state) {
      throw serverUnavailable('Unable to verify the backing workflow. Try again.');
    }
    throw conflict('Repair the backing workflow before changing or running this automation.');
  };

  const assertAvailable = async (
    automation: Pick<NightshiftAutomationRecord, 'id' | 'workflowId' | 'isEnabled'>,
    spaceId: string
  ): Promise<void> => {
    const states = await getStates([automation], spaceId);
    assertStateAvailable(states.get(automation.id)?.state);
  };

  const reconcile = (
    request: KibanaRequest,
    spaceId: string,
    id: string,
    changes: AutomationUpdate,
    repairOnly: boolean
  ): Promise<NightshiftAutomationRecord> =>
    withLock(spaceId, id, async () => {
      const workflows = management();
      const serviceAccountId = await getInvestigatorServiceAccountService().resolveAutomationRunAs(
        request,
        spaceId
      );
      const soClient = getAutomationsSoClient(request, spaceId);
      const existing = await soClient.get<NightshiftAutomationAttributes>(
        NIGHTSHIFT_AUTOMATION_SO_TYPE,
        id
      );
      const merged: NightshiftAutomationAttributes = {
        ...applyChanges(existing.attributes, {
          name: changes.name,
          description: changes.description,
          tags: changes.tags,
          isEnabled: changes.isEnabled,
          trigger: changes.trigger,
          completions: changes.completions,
        }),
        execution: applyChanges(existing.attributes.execution, changes.execution ?? {}),
        runtime: applyChanges(existing.attributes.runtime, changes.runtime ?? {}),
        updatedAt: new Date().toISOString(),
      };
      const pauseOnly = changes.isEnabled === false && Object.keys(changes).length === 1;

      // This trusted, space-scoped lookup does not confuse an ACL-hidden workflow with deletion.
      const readWorkflow = async () => {
        if (!existing.attributes.workflowId) return undefined;
        try {
          return (await readStates([existing.attributes.workflowId], spaceId))[0];
        } catch {
          throw serverUnavailable('Unable to verify the backing workflow. Try again.');
        }
      };
      let workflow = await readWorkflow();
      if (!repairOnly && !pauseOnly) {
        assertStateAvailable(
          !workflow
            ? 'missing'
            : workflow.enabled === existing.attributes.isEnabled
            ? 'available'
            : 'out_of_sync'
        );
      }
      if (repairOnly && workflow?.enabled === merged.isEnabled) {
        return { id, ...existing.attributes, backingWorkflow: { state: 'available' } };
      }
      if (!pauseOnly) {
        const completions = automationCompletionSchema
          .array()
          .max(10)
          .safeParse(merged.completions);
        if (!completions.success) throw badRequest(completions.error.message);
        merged.completions = completions.data;
        validateScheduledAutomation(merged);
      }
      const save = () =>
        soClient.update<NightshiftAutomationAttributes>(NIGHTSHIFT_AUTOMATION_SO_TYPE, id, merged, {
          mergeAttributes: false,
          ...(existing.version ? { version: existing.version } : {}),
        });
      const yaml = (isEnabled: boolean) =>
        generateWorkflowYaml({
          automationId: id,
          automation: { ...merged, isEnabled },
          serviceAccountId,
          universalAlerts: isUniversalAlertingAvailable(),
        });

      const verifySavedState = async (): Promise<NightshiftAutomationRecord> => {
        let savedWorkflow: { id: string; enabled: boolean } | undefined;
        try {
          [savedWorkflow] = await readStates(merged.workflowId ? [merged.workflowId] : [], spaceId);
        } catch {
          throw serverUnavailable(
            'The automation was saved, but its backing workflow could not be verified. Refresh and try again.'
          );
        }
        if (!savedWorkflow || savedWorkflow.enabled !== merged.isEnabled) {
          throw conflict(
            'The automation was saved but its backing workflow could not be synchronized. Use Repair to try again.'
          );
        }
        return { id, ...merged, backingWorkflow: { state: 'available' } };
      };

      if (workflow) {
        try {
          await workflows.updateWorkflow(
            workflow.id,
            pauseOnly ? { enabled: false } : { yaml: yaml(merged.isEnabled) },
            spaceId,
            request
          );
        } catch (error) {
          // An external deletion can race the first lookup. Only confirmed absence permits create.
          workflow = await readWorkflow();
          if (workflow) throw error;
          if (!repairOnly && !pauseOnly) assertStateAvailable('missing');
        }
        if (workflow) {
          await save();
          const result = await verifySavedState();
          if (repairOnly)
            logger.info(
              `Repaired automation ${id} in space ${spaceId} with workflow ${workflow.id}`
            );
          return result;
        }
      }
      if (pauseOnly) {
        await save();
        return { id, ...merged, backingWorkflow: { state: 'missing' } };
      }
      const replacement = await workflows.createWorkflow({ yaml: yaml(false) }, spaceId, request);
      merged.workflowId = replacement.id;
      merged.previousWorkflowIds = [
        ...new Set([
          ...(existing.attributes.previousWorkflowIds ?? []),
          ...(existing.attributes.workflowId ? [existing.attributes.workflowId] : []),
        ]),
      ];
      try {
        await save();
      } catch (error) {
        const logCleanupFailure = () =>
          logger.warn(
            `Could not remove disabled replacement ${replacement.id} for automation ${id} in space ${spaceId}`
          );
        try {
          const result = await workflows.deleteWorkflows([replacement.id], spaceId, request);
          if (result.failures.length > 0) logCleanupFailure();
        } catch {
          logCleanupFailure();
        }
        throw error;
      }
      if (merged.isEnabled) {
        try {
          await workflows.updateWorkflow(replacement.id, { enabled: true }, spaceId, request);
        } catch {
          // Workflows can fail after persisting activation, so compensate before returning failure.
          try {
            await workflows.updateWorkflow(replacement.id, { enabled: false }, spaceId, request);
          } catch {
            logger.warn(
              `Could not disable linked replacement ${replacement.id} for automation ${id} in space ${spaceId}`
            );
          }
          throw badRequest(
            'The backing workflow was repaired but could not be enabled. Use Repair and enable to try again.'
          );
        }
      }
      const result = await verifySavedState();
      logger.info(`Repaired automation ${id} in space ${spaceId} with workflow ${replacement.id}`);
      return result;
    });

  return {
    withLock,
    getStates,
    assertAvailable,
    update: (request: KibanaRequest, spaceId: string, id: string, changes: AutomationUpdate) =>
      reconcile(request, spaceId, id, changes, false),
    repair: (request: KibanaRequest, spaceId: string, id: string) =>
      reconcile(request, spaceId, id, {}, true),
  };
};

export type AutomationWorkflowService = ReturnType<typeof createAutomationWorkflowService>;
