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
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
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
import type {
  AlertTriageAttachmentService,
  AlertTriageAttachmentServiceProvider,
} from '../../types';
import {
  attachAlertTriageWorkerToAllRules,
  detachAlertTriageWorkerFromAllRules,
} from './alert_triage_rule_attachments';

interface AlertTriageOpts {
  getAttachmentService?: AlertTriageAttachmentServiceProvider;
  /**
   * Whether the Alert Analysis workflow will actually analyse anything in the caller's space.
   * Distinct from its `enabled` flag: the workflow installs enabled, but its own guard also
   * requires a per-space uiSetting that now defaults to off, and with that off it completes
   * having classified nothing instead of failing. Injected rather than read here because the
   * setting belongs to security_solution.
   */
  isAlertAnalysisRuntimeEnabled?: (request: KibanaRequest) => Promise<boolean>;
}

/**
 * Workers hidden until the named skill is registered. These skills may be
 * behind a feature flag and so are conditionally registered
 */
const WORKER_IDS_BY_REQUIRED_SKILL: Readonly<Record<string, readonly string[]>> = {
  'endpoint-forensic-analysis': [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID],
};

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

/** Why an Alert Triage Worker enable was refused before anything was written. */
export type AlertTriageEnableBlockedReason =
  | 'alertAnalysisWorkflowDisabled'
  | 'alertAnalysisRuntimeDisabled'
  | 'ruleAttachmentUnavailable';

export type WorkerUpdateResult =
  | { outcome: 'updated'; response: UpdateWorkerResponse }
  | { outcome: 'not-found' }
  | { outcome: 'rejected'; what: string }
  | { outcome: 'blocked'; reason: AlertTriageEnableBlockedReason }
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

  private async hiddenWorkerIds(request: KibanaRequest): Promise<ReadonlySet<string>> {
    const entries = Object.entries(WORKER_IDS_BY_REQUIRED_SKILL);
    const gatedWorkerIds = entries.flatMap(([, workerIds]) => workerIds);
    if (gatedWorkerIds.length === 0) return new Set();

    const { agentBuilder } = this.agentOpts;
    if (!agentBuilder) return new Set(gatedWorkerIds);

    try {
      const registry = await agentBuilder.skills.getRegistry({ request });
      const checks = await Promise.all(
        entries.map(async ([skillId, workerIds]) => ({
          workerIds,
          registered: await registry.has(skillId),
        }))
      );
      return new Set(
        checks.filter(({ registered }) => !registered).flatMap(({ workerIds }) => workerIds)
      );
    } catch (error) {
      this.logger.warn(
        `Failed to read worker skill gates: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return new Set(gatedWorkerIds);
    }
  }

  async list(request: KibanaRequest, spaceId: string): Promise<ListWorkersResponse> {
    await this.ensureAgent(spaceId);

    const agentLookup = await this.buildAgentLookup(request);
    const hiddenWorkerIds = await this.hiddenWorkerIds(request);
    const workers = await Promise.all(
      workerRegistry
        .list()
        .filter((registration) => !hiddenWorkerIds.has(registration.id))
        .map((registration) => this.projectWorker(registration, spaceId, request, agentLookup))
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
    if ((await this.hiddenWorkerIds(request)).has(registration.id)) {
      return undefined;
    }

    const agentLookup = await this.buildAgentLookup(request);
    return this.projectWorker(registration, spaceId, request, agentLookup);
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
    if ((await this.hiddenWorkerIds(request)).has(registration.id)) {
      return { outcome: 'not-found' };
    }

    const touchesSettings = touchesWorkerSettings(patch);
    const managedWorkflows = await this.requireManagedWorkflows();
    const management = this.requireManagement();
    let status = await managedWorkflows.getWorkflowStatus(registration.id, {
      spaceId,
      workflowIdSuffix: spaceId,
    });

    const isAlertTriageWorker = workerId === SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
    let alertTriageAttachmentService: AlertTriageAttachmentService | undefined;

    // Validate the enable half before writing anything: a combined settings-and-enable PATCH
    // must not persist new settings (below) when the enable half is refused, or the operator
    // is left with a bumped revision and no way back to a consistent "not yet enabled" state.
    // `status.workflowId` is deterministic regardless of install state, so this can run first.
    if (isAlertTriageWorker && patch.enabled) {
      const blockedReason = await this.checkAlertAnalysisPreflight(request);
      if (blockedReason) {
        return { outcome: 'blocked', reason: blockedReason };
      }

      alertTriageAttachmentService = await this.getAlertTriageAttachmentService(
        request,
        status.workflowId
      );
      if (!alertTriageAttachmentService) {
        return { outcome: 'blocked', reason: 'ruleAttachmentUnavailable' };
      }
    }

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

      if (isAlertTriageWorker && patch.enabled && alertTriageAttachmentService) {
        // Attach-then-enable: the Worker only fires from rules carrying its action, so enabling
        // without attaching produces a Worker that never runs. Preflight and attachment-service
        // resolution already ran above, before anything was written.
        // A failed bulk edit leaves the Worker off, not enabled-but-unattached: attach runs in
        // passes (see alert_triage_rule_attachments.ts), so a later pass can throw after an
        // earlier one already attached some rules. Roll those back on failure — best-effort, so
        // a failed rollback does not mask the original error — rather than leave rules carrying
        // the action while the Worker itself stays (or is reported) disabled.
        await attachAlertTriageWorkerToAllRules(alertTriageAttachmentService).catch(
          async (err: Error) => {
            this.logger.error(`Alert Triage Worker: rule attachment failed: ${err.message}`);
            await detachAlertTriageWorkerFromAllRules(alertTriageAttachmentService).catch(
              (rollbackErr: Error) => {
                this.logger.error(
                  `Alert Triage Worker: rollback detach after failed attach also failed: ${rollbackErr.message}`
                );
              }
            );
            throw err;
          }
        );
      }

      await management.updateWorkflow(
        status.workflowId,
        { enabled: patch.enabled },
        spaceId,
        request
      );

      if (isAlertTriageWorker && !patch.enabled) {
        // Detach after disabling; don't let a partial detach fail the disable.
        const attachmentService = await this.getAlertTriageAttachmentService(
          request,
          status.workflowId
        );
        if (attachmentService) {
          await detachAlertTriageWorkerFromAllRules(attachmentService).catch((err: Error) => {
            this.logger.error(`Alert Triage Worker: rule detachment failed: ${err.message}`);
          });
        } else {
          this.logger.warn(
            'Alert Triage Worker: disabled without detaching rules; the rule-attachment service is unavailable'
          );
        }
      }
    }

    const agentLookup = await this.buildAgentLookup(request);
    const worker = await this.projectWorker(registration, spaceId, request, agentLookup);
    return { outcome: 'updated', response: { worker } };
  }

  /**
   * Returns why the Alert Analysis workflow cannot do the Worker's work, or null if the enable
   * may proceed. The Worker wraps that workflow, so enabling it against an unusable one
   * produces a Worker that triages nothing.
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
   * by security_solution, so it is not ours to flip.
   */
  private async checkAlertAnalysisPreflight(
    request: KibanaRequest
  ): Promise<AlertTriageEnableBlockedReason | null> {
    const management = this.management;
    if (!management) return null;
    try {
      const workflow = await management.getWorkflow(
        SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
        GLOBAL_WORKFLOW_SPACE_ID,
        request
      );
      // `getWorkflow` returns null for an absent workflow, not just a present-but-disabled one.
      // `workflow.execute` against a nonexistent workflow fails the same way as against a
      // disabled one, so both must block the enable the same way.
      if (!workflow || !workflow.enabled) {
        return 'alertAnalysisWorkflowDisabled';
      }
    } catch (err) {
      // Degrades to the runtime-config check below and, ultimately, to the YAML-level
      // `require_analysis_enabled` guard at execution time: refusing on a transient read
      // failure here would make the Worker un-enableable whenever `getWorkflow` errors for an
      // unrelated reason, and a disabled workflow still fails closed at run time regardless.
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
          return 'alertAnalysisRuntimeDisabled';
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

  private async getAlertTriageAttachmentService(
    request: KibanaRequest,
    installedWorkflowId: string
  ): Promise<AlertTriageAttachmentService | undefined> {
    const { getAttachmentService } = this.alertTriageOpts;
    return getAttachmentService?.(request, installedWorkflowId);
  }

  private async projectWorker(
    registration: WorkerRegistration,
    spaceId: string,
    request: KibanaRequest,
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
          management.getWorkflow(status.workflowId, spaceId, request),
          management.getWorkflowExecutions(
            { workflowId: status.workflowId, page: 1, size: 1 },
            spaceId,
            request
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
      // `installed` is any document at this id, including a user workflow that is not ours.
      workflowId: status.installed && status.status !== 'not_managed' ? status.workflowId : null,
      skills: projectSkillsFromDefinition(definition, agentLookupCallback),
    };
  }
}
