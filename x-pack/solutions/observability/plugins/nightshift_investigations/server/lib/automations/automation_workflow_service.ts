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
import type { AutomationUpdate } from '../../routes/automations/update_automation';

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

  const readWorkflow = async (
    workflowId: string | undefined,
    spaceId: string,
    message = 'Unable to verify the backing workflow. Try again.'
  ) => {
    try {
      return workflowId ? (await readStates([workflowId], spaceId))[0] : undefined;
    } catch {
      throw serverUnavailable(message);
    }
  };

  const validate = (automation: NightshiftAutomationAttributes): void => {
    const completions = automationCompletionSchema
      .array()
      .max(10)
      .safeParse(automation.completions);
    if (!completions.success) throw badRequest(completions.error.message);
    automation.completions = completions.data;
    validateScheduledAutomation(automation);
  };

  const load = async (request: KibanaRequest, spaceId: string, id: string) => {
    const workflows = management();
    const serviceAccountId = await getInvestigatorServiceAccountService().resolveAutomationRunAs(
      request,
      spaceId
    );
    const soClient = getAutomationsSoClient(request, spaceId);
    const { attributes, version } = await soClient.get<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      id
    );
    return {
      attributes,
      workflows,
      read: () => readWorkflow(attributes.workflowId, spaceId),
      save: (automation: NightshiftAutomationAttributes) =>
        soClient.update<NightshiftAutomationAttributes>(
          NIGHTSHIFT_AUTOMATION_SO_TYPE,
          id,
          automation,
          {
            mergeAttributes: false,
            ...(version ? { version } : {}),
          }
        ),
      yaml: (automation: NightshiftAutomationAttributes, isEnabled = automation.isEnabled) =>
        generateWorkflowYaml({
          automationId: id,
          automation: { ...automation, isEnabled },
          serviceAccountId,
          universalAlerts: isUniversalAlertingAvailable(),
        }),
      updateWorkflow: async (
        workflowId: string,
        changes: { yaml?: string; enabled?: boolean }
      ): Promise<boolean> => {
        try {
          await workflows.updateWorkflow(workflowId, changes, spaceId, request);
          return true;
        } catch (error) {
          // An external deletion may race the first lookup; propagate every other failure.
          if (await readWorkflow(attributes.workflowId, spaceId)) throw error;
          return false;
        }
      },
      verify: async (
        automation: NightshiftAutomationAttributes
      ): Promise<NightshiftAutomationRecord> => {
        const workflow = await readWorkflow(
          automation.workflowId,
          spaceId,
          'The automation was saved, but its backing workflow could not be verified. Refresh and try again.'
        );
        if (!workflow || workflow.enabled !== automation.isEnabled) {
          throw conflict(
            'The automation was saved but its backing workflow could not be synchronized. Use Repair to try again.'
          );
        }
        return { id, ...automation, backingWorkflow: { state: 'available' } };
      },
    };
  };

  const update = (
    request: KibanaRequest,
    spaceId: string,
    id: string,
    changes: AutomationUpdate
  ): Promise<NightshiftAutomationRecord> =>
    withLock(spaceId, id, async () => {
      const { attributes, read, save, yaml, updateWorkflow, verify } = await load(
        request,
        spaceId,
        id
      );
      const automation: NightshiftAutomationAttributes = {
        ...applyChanges(attributes, {
          name: changes.name,
          description: changes.description,
          tags: changes.tags,
          isEnabled: changes.isEnabled,
          trigger: changes.trigger,
          completions: changes.completions,
        }),
        execution: applyChanges(attributes.execution, changes.execution ?? {}),
        runtime: applyChanges(attributes.runtime, changes.runtime ?? {}),
        updatedAt: new Date().toISOString(),
      };
      const pauseOnly = changes.isEnabled === false && Object.keys(changes).length === 1;
      const workflow = await read();
      if (!pauseOnly) {
        assertStateAvailable(
          !workflow
            ? 'missing'
            : workflow.enabled === attributes.isEnabled
            ? 'available'
            : 'out_of_sync'
        );
        validate(automation);
      }
      if (
        workflow &&
        (await updateWorkflow(
          workflow.id,
          pauseOnly ? { enabled: false } : { yaml: yaml(automation) }
        ))
      ) {
        await save(automation);
        return verify(automation);
      }
      if (!pauseOnly) assertStateAvailable('missing');
      await save(automation);
      return { id, ...automation, backingWorkflow: { state: 'missing' } };
    });

  const repair = (
    request: KibanaRequest,
    spaceId: string,
    id: string
  ): Promise<NightshiftAutomationRecord> =>
    withLock(spaceId, id, async () => {
      const { attributes, workflows, read, save, yaml, updateWorkflow, verify } = await load(
        request,
        spaceId,
        id
      );
      const workflow = await read();
      if (workflow?.enabled === attributes.isEnabled) {
        return { id, ...attributes, backingWorkflow: { state: 'available' } };
      }
      const automation = { ...attributes, updatedAt: new Date().toISOString() };
      validate(automation);
      if (workflow && (await updateWorkflow(workflow.id, { yaml: yaml(automation) }))) {
        await save(automation);
      } else {
        const replacement = await workflows.createWorkflow(
          { yaml: yaml(automation, false) },
          spaceId,
          request
        );
        automation.workflowId = replacement.id;
        automation.previousWorkflowIds = [
          ...new Set([
            ...(attributes.previousWorkflowIds ?? []),
            ...(attributes.workflowId ? [attributes.workflowId] : []),
          ]),
        ];
        try {
          await save(automation);
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
        if (automation.isEnabled) {
          try {
            await workflows.updateWorkflow(replacement.id, { enabled: true }, spaceId, request);
          } catch {
            // Activation can fail after being persisted, so compensate before returning failure.
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
      }
      const result = await verify(automation);
      logger.info(
        `Repaired automation ${id} in space ${spaceId} with workflow ${automation.workflowId}`
      );
      return result;
    });

  return { withLock, getStates, assertAvailable, update, repair };
};

export type AutomationWorkflowService = ReturnType<typeof createAutomationWorkflowService>;
