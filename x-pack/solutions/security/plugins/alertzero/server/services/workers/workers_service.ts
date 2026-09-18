/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { UpdateWorkerResponse } from '@kbn/alertzero-common';
import {
  ListWorkersResponse,
  touchesWorkerSettings,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  type UpdateWorkerRequestBody,
  type Worker,
} from '@kbn/alertzero-common';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowSchema } from '@kbn/workflows';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { SECURITY_ALERT_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import {
  installRegisteredWorker,
  workerRegistry,
  type WorkerRegistration,
} from '../../managed_workflows/worker_registry';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import type { AgentLookup } from '../utils';
import { buildAgentLookup, projectSkillsFromDefinition } from '../utils';

interface AlertTriageAttachmentService {
  getRuleAttachmentSelection(params: {
    search: string;
    attachmentFilter: 'all' | 'attached' | 'not_attached';
  }): Promise<{ ruleIds: string[]; attachedRuleIds: string[] }>;
  updateRuleAttachments(params: {
    attachRuleIds: string[];
    detachRuleIds: string[];
  }): Promise<unknown>;
}

interface AlertTriageOpts {
  getAttachmentService?: (
    request: KibanaRequest,
    workflowId: string
  ) => Promise<AlertTriageAttachmentService>;
  /**
   * Whether the Alert Analysis workflow will actually analyse anything in the caller's space.
   * Distinct from its `enabled` flag: the workflow installs enabled, but its own guard also
   * requires a per-space uiSetting that now defaults to off, and with that off it completes
   * having classified nothing instead of failing. Injected rather than read here because the
   * setting belongs to security_solution.
   */
  isAlertAnalysisRuntimeEnabled?: (request: KibanaRequest) => Promise<boolean>;
}

const getDefinitionFromTemplate = (registration: WorkerRegistration): WorkflowYaml | null => {
  const managedDef: ManagedWorkflowDefinition | undefined = getManagedWorkflowDefinition(
    registration.id
  );
  if (managedDef && 'yamlTemplate' in managedDef) {
    const yaml = managedDef.yamlTemplate?.(registration.settings.createDefaultValues());
    if (yaml) {
      const result = parseWorkflowYamlToJSON(yaml, WorkflowSchema);
      return result.success ? (result.data as unknown as WorkflowYaml) : null;
    }
  }
  return null;
};

const templateValuesEqual = (
  left: Record<string, unknown> | null,
  right: Record<string, unknown>
): boolean =>
  left != null &&
  Object.keys(right).every((key) => Object.hasOwn(left, key) && isEqual(left[key], right[key]));

export type WorkerUpdateResult =
  | { outcome: 'updated'; response: UpdateWorkerResponse }
  | { outcome: 'not-found' }
  | { outcome: 'rejected'; what: string; settingsPath?: string }
  | { outcome: 'invalid'; message: string }
  | { outcome: 'conflict' }
  | { outcome: 'unavailable' }
  | { outcome: 'failed' };

export class WorkersService {
  private readonly agentTypeMap: ReadonlyMap<string, AgentTypeDefinition>;

  constructor(
    private readonly management: WatchWorkflowsManagementClient | undefined,
    private readonly managedWorkflows:
      | Promise<PluginScopedManagedWorkflowsApi | undefined>
      | undefined,
    private readonly logger: Logger,
    private readonly agentOpts: {
      /** Lazy ensure of the shared thin agent for the caller's space. */
      ensureAgentForSpace?: (spaceId: string) => Promise<void>;
      agentBuilder?: AgentBuilderPluginStart;
      /** Code-registered agent types owned by this plugin, used for skill base resolution. */
      agentTypes?: readonly AgentTypeDefinition[];
    } = {},
    private readonly alertTriageOpts: AlertTriageOpts = {}
  ) {
    this.agentTypeMap = new Map((agentOpts.agentTypes ?? []).map((t) => [t.id, t]));
  }

  private requireManagement(): WatchWorkflowsManagementClient {
    if (!this.management) {
      throw new Error('Workflows management API is not available');
    }
    return this.management;
  }

  private async requireManagedWorkflows(): Promise<PluginScopedManagedWorkflowsApi> {
    if (!this.managedWorkflows) {
      throw new Error('Managed Workflows API is not available');
    }
    const managedWorkflows = await this.managedWorkflows;
    if (!managedWorkflows) {
      throw new Error('Managed Workflows API is not available');
    }
    return managedWorkflows;
  }

  private async ensureAgent(spaceId: string): Promise<void> {
    await this.agentOpts.ensureAgentForSpace?.(spaceId);
  }

  private async buildAgentLookup(request: KibanaRequest) {
    if (!this.agentOpts.agentBuilder) return undefined;
    return buildAgentLookup(this.agentOpts.agentBuilder, this.agentTypeMap, request, this.logger);
  }

  async list(request: KibanaRequest, spaceId: string): Promise<ListWorkersResponse> {
    await this.ensureAgent(spaceId);

    const agentLookup = await this.buildAgentLookup(request);
    const workers = await Promise.all(
      workerRegistry
        .list()
        .map((registration) => this.projectWorker(registration, spaceId, agentLookup))
    );
    return ListWorkersResponse.parse({ workers });
  }

  async get(
    workerId: string,
    request: KibanaRequest,
    spaceId: string
  ): Promise<Worker | undefined> {
    await this.ensureAgent(spaceId);
    const registration = workerRegistry.get(workerId);
    if (!registration) {
      return undefined;
    }

    const agentLookup = await this.buildAgentLookup(request);
    return this.projectWorker(registration, spaceId, agentLookup);
  }

  async update(
    workerId: string,
    patch: UpdateWorkerRequestBody,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkerUpdateResult> {
    const registration = workerRegistry.get(workerId);
    if (!registration) {
      return { outcome: 'not-found' };
    }

    const touchesSettings = touchesWorkerSettings(patch);
    const managedWorkflows = await this.requireManagedWorkflows();
    const management = this.requireManagement();
    let status = await managedWorkflows.getWorkflowStatus(registration.id, {
      spaceId,
      workflowIdSuffix: spaceId,
    });

    if (touchesSettings) {
      if (patch.settingsRevision === undefined) {
        return { outcome: 'rejected', what: 'a settings update without its revision' };
      }

      const state = status.installed
        ? await managedWorkflows.getInstalledWorkflowState(status.workflowId, spaceId)
        : null;
      if (status.installed && !state) return { outcome: 'unavailable' };
      if (patch.settingsRevision !== (state?.documentVersion ?? null)) {
        return { outcome: 'conflict' };
      }
      const currentValues = state?.templateValues ?? registration.settings.createDefaultValues();
      const applied = registration.settings.applyPatch(currentValues, patch.settings ?? {});
      if ('invalid' in applied) {
        return { outcome: 'invalid', message: applied.invalid };
      }

      await installRegisteredWorker(managedWorkflows, registration, {
        spaceId,
        workflowIdSuffix: spaceId,
        values: applied.values,
      });
      status = await managedWorkflows.getWorkflowStatus(registration.id, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
      if (!status.installed) return { outcome: 'unavailable' };
      const persisted = await managedWorkflows.getInstalledWorkflowState(
        status.workflowId,
        spaceId
      );
      if (!persisted || !templateValuesEqual(persisted.templateValues, applied.values)) {
        this.logger.error(
          `Worker "${registration.id}" settings write could not be confirmed after save`
        );
        return { outcome: 'failed' };
      }

      await management.updateWorkflow(
        status.workflowId,
        { enabled: Boolean(status.enabled) },
        spaceId,
        request
      );
      status = await managedWorkflows.getWorkflowStatus(registration.id, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
    }

    if (patch.enabled != null) {
      if (!status.installed) {
        await installRegisteredWorker(managedWorkflows, registration, {
          spaceId,
          workflowIdSuffix: spaceId,
          values: registration.settings.createDefaultValues(),
        });
        status = await managedWorkflows.getWorkflowStatus(registration.id, {
          spaceId,
          workflowIdSuffix: spaceId,
        });
        if (!status.installed) return { outcome: 'unavailable' };
      }

      const isAlertTriageEnabled = workerId === SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;

      const isAlertTriageWorker =
        isAlertTriageEnabled && this.alertTriageOpts.getAttachmentService != null;

      if (isAlertTriageEnabled && patch.enabled) {
        const preflight = await this.checkAlertAnalysisPreflight(request);
        if (preflight) {
          return {
            outcome: 'rejected',
            what: preflight.message,
            settingsPath: preflight.settingsPath,
          };
        }
      }

      if (isAlertTriageWorker && patch.enabled) {
        // Attach-then-enable: a failed bulk edit leaves the Worker off, not enabled-but-unattached.
        await this.attachAlertTriageWorkerToAllRules(request).catch((err: Error) => {
          this.logger.error(`Alert Triage Worker: rule attachment failed: ${err.message}`);
          throw err;
        });
      }

      await management.updateWorkflow(
        status.workflowId,
        { enabled: patch.enabled },
        spaceId,
        request
      );

      if (isAlertTriageWorker && !patch.enabled) {
        // Detach after disabling; don't let a partial detach fail the disable.
        await this.detachAlertTriageWorkerFromAllRules(request).catch((err: Error) => {
          this.logger.error(`Alert Triage Worker: rule detachment failed: ${err.message}`);
        });
      }
    }

    const agentLookup = await this.buildAgentLookup(request);
    const worker = await this.projectWorker(registration, spaceId, agentLookup);
    return { outcome: 'updated', response: { worker } };
  }

  /**
   * Returns an error message if the Alert Analysis workflow cannot do the Worker's work, null
   * if the enable may proceed. The Worker is a wrapper around that workflow (R8), so enabling
   * it against an unusable one produces a Worker that triages nothing.
   *
   * Two independent things have to hold, and they fail differently:
   *
   * - the workflow must be `enabled`, or `workflow.execute` throws and every rule trigger
   *   surfaces a failed execution
   * - its per-space runtime config must have analysis switched on. This is the quieter of the
   *   two and the reason the check cannot stop at the `enabled` flag: the workflow installs
   *   enabled, but `securitySolution:alertAnalysisWorkflowEnabled` now defaults to false, and
   *   with it off the workflow's own guard short-circuits and it returns an empty verdict set.
   *   The Worker then completes successfully having classified, tagged and closed nothing.
   *
   * Refusing rather than switching it on is deliberate: that setting is `readonly` and owned
   * by security_solution, so it is not ours to flip. See FOLLOW_UPS.md.
   */
  private async checkAlertAnalysisPreflight(
    request: KibanaRequest
  ): Promise<{ message: string; settingsPath?: string } | null> {
    const management = this.management;
    if (!management) return null;
    try {
      const workflow = await management.getWorkflow(
        SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
        GLOBAL_WORKFLOW_SPACE_ID
      );
      if (workflow && !workflow.enabled) {
        return {
          message:
            'Alert Triage requires the Alert Analysis workflow, which is disabled in this deployment. Enable it before turning on the Alert Triage Worker.',
        };
      }
    } catch (err) {
      this.logger.warn(
        `Alert Triage Worker: could not verify Alert Analysis workflow state: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const { isAlertAnalysisRuntimeEnabled } = this.alertTriageOpts;
    if (isAlertAnalysisRuntimeEnabled) {
      try {
        if (!(await isAlertAnalysisRuntimeEnabled(request))) {
          return {
            message:
              'Alert Triage requires alert analysis to be turned on for this space. Go to Alert analysis settings, then turn on the Alert Triage Worker.',
            settingsPath: '/rules/alert_analysis_workflow',
          };
        }
      } catch (err) {
        // Refusing on an unreadable setting would make the Worker un-enableable whenever the
        // read fails for an unrelated reason, so this degrades to the checks above.
        this.logger.warn(
          `Alert Triage Worker: could not verify alert analysis runtime config: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    return null;
  }

  private async attachAlertTriageWorkerToAllRules(request: KibanaRequest): Promise<void> {
    const { getAttachmentService } = this.alertTriageOpts;
    if (!getAttachmentService) return;
    const service = await getAttachmentService(
      request,
      SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
    );
    const selection = await service.getRuleAttachmentSelection({
      search: '',
      attachmentFilter: 'not_attached',
    });
    if (selection.ruleIds.length === 0) return;
    await service.updateRuleAttachments({
      attachRuleIds: selection.ruleIds,
      detachRuleIds: [],
    });
  }

  private async detachAlertTriageWorkerFromAllRules(request: KibanaRequest): Promise<void> {
    const { getAttachmentService } = this.alertTriageOpts;
    if (!getAttachmentService) return;
    const service = await getAttachmentService(
      request,
      SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
    );
    const selection = await service.getRuleAttachmentSelection({
      search: '',
      attachmentFilter: 'attached',
    });
    if (selection.attachedRuleIds.length === 0) return;
    await service.updateRuleAttachments({
      attachRuleIds: [],
      detachRuleIds: selection.attachedRuleIds,
    });
  }

  private async projectWorker(
    registration: WorkerRegistration,
    spaceId: string,
    agentLookupCallback?: AgentLookup
  ): Promise<Worker> {
    const managedWorkflows = await this.requireManagedWorkflows();
    const status = await managedWorkflows.getWorkflowStatus(registration.id, {
      spaceId,
      workflowIdSuffix: spaceId,
    });

    let enabled = false;
    let lastRun: string | null = null;
    let settingsRevision: number | null = null;
    // Defaults stand in for an uninstalled Worker and for one whose stored settings cannot be read.
    let settings = registration.settings.toSettings(registration.settings.createDefaultValues());
    let settingsUnavailable = false;
    let definition: WorkflowYaml | null = null;

    if (status.installed) {
      enabled = Boolean(status.enabled);
      try {
        const state = await managedWorkflows.getInstalledWorkflowState(status.workflowId, spaceId);
        if (!state?.templateValues) {
          settingsUnavailable = true;
        } else {
          // Parse before taking the revision so an unreadable document reports revision null.
          settings = registration.settings.toSettings(state.templateValues);
          settingsRevision = state.documentVersion ?? null;
        }
      } catch (error) {
        settingsUnavailable = true;
        this.logger.warn(
          `Failed to read settings for worker ${registration.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      try {
        const management = this.requireManagement();
        const [detail, executions] = await Promise.all([
          management.getWorkflow(status.workflowId, spaceId),
          management.getWorkflowExecutions(
            { workflowId: status.workflowId, page: 1, size: 1 },
            spaceId
          ),
        ]);
        definition = detail?.definition ?? null;
        lastRun = executions.results[0]?.startedAt ?? null;
      } catch (error) {
        this.logger.debug(
          `Failed to load workflow detail or executions for worker ${registration.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      definition = getDefinitionFromTemplate(registration);
    }

    return {
      id: registration.id,
      name: registration.catalog.name,
      watchIds: [registration.catalog.watchId],
      enabled,
      lastRun,
      state: settingsUnavailable ? 'unavailable' : enabled ? 'ok' : 'paused',
      ...(settingsUnavailable
        ? { stateReason: 'Worker settings could not be read from durable storage' }
        : {}),
      settings,
      settingsRevision,
      skills: projectSkillsFromDefinition(definition, agentLookupCallback),
    };
  }
}
