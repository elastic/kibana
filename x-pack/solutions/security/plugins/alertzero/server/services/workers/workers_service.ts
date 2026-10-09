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
  isWorkerEnableBlocked,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  touchesWorkerSettings,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  type UpdateWorkerRequestBody,
  type Worker,
  type WorkerBlockingReason,
} from '@kbn/alertzero-common';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowSchema } from '@kbn/workflows';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { SECURITY_ALERT_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  ManagedWorkflowDefinition,
  ManagedWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import { workerRegistry, type WorkerRegistration } from '../../managed_workflows/worker_registry';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import type { AgentLookup } from '../utils';
import { buildAgentLookup, projectSkillsFromDefinition } from '../utils';
import {
  ThreatIntelSupplyHardGateError,
  ThreatIntelSupplyNotInstalledError,
  type ThreatIntelSupplyService,
} from '../threat_intel_supply';
import type { GetWorkerBlockingReasons } from './worker_blocking_reasons';

interface AlertTriageOpts {
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

/** Why enabling any Worker in the space was refused before anything was written. */
export type SpaceEnableBlockedReason = 'noModel';

/** Why an Alert Triage Worker enable was refused before anything was written. */
export type AlertTriageEnableBlockedReason =
  | 'alertAnalysisWorkflowDisabled'
  | 'alertAnalysisRuntimeDisabled';

/** Why Continuous Threat Hunt enable was refused before anything was written. */
export type HuntSupplyEnableBlockedReason =
  | 'huntSupplyPrerequisitesUnmet'
  | 'huntSupplyNotInstalled';

/** Why a Worker enable was refused before anything was written. */
export type WorkerEnableBlockedReason =
  | SpaceEnableBlockedReason
  | AlertTriageEnableBlockedReason
  | HuntSupplyEnableBlockedReason;

const readServiceAccountId = (
  values: Record<string, unknown> | null | undefined
): string | undefined => {
  const id = values?.serviceAccountId;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
};

/** User saves install through the request-scoped workflows client so `run_as` can bind. */
export type InstallWorkerForRequest = (
  request: KibanaRequest,
  registration: WorkerRegistration,
  options: {
    spaceId: string;
    workflowIdSuffix?: string;
    values?: ManagedWorkflowTemplateValues;
  }
) => Promise<void>;

export type WorkerUpdateResult =
  | { outcome: 'updated'; response: UpdateWorkerResponse }
  | { outcome: 'not-found' }
  | { outcome: 'rejected'; what: string }
  | { outcome: 'blocked'; reason: WorkerEnableBlockedReason }
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
    private readonly alertTriageOpts: AlertTriageOpts = {},
    private readonly installWorkerForRequest: InstallWorkerForRequest,
    private readonly getBlockingReasons: GetWorkerBlockingReasons,
    private readonly threatIntelSupply?: ThreatIntelSupplyService
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

  private async persistWorker(
    request: KibanaRequest,
    registration: WorkerRegistration,
    options: {
      spaceId: string;
      workflowIdSuffix: string;
      values: ManagedWorkflowTemplateValues;
    }
  ): Promise<void> {
    await this.installWorkerForRequest(request, registration, options);
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

    const [agentLookup, hiddenWorkerIds, blockingReasons] = await Promise.all([
      this.buildAgentLookup(request),
      this.hiddenWorkerIds(request),
      this.getBlockingReasons(request),
    ]);
    const workers = await Promise.all(
      workerRegistry
        .list()
        .filter((registration) => !hiddenWorkerIds.has(registration.id))
        .map((registration) =>
          this.projectWorker(registration, spaceId, request, blockingReasons, agentLookup)
        )
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

    const [agentLookup, blockingReasons] = await Promise.all([
      this.buildAgentLookup(request),
      this.getBlockingReasons(request),
    ]);
    return this.projectWorker(registration, spaceId, request, blockingReasons, agentLookup);
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
    const blockingReasons = await this.getBlockingReasons(request);
    if (patch.enabled === true && isWorkerEnableBlocked(blockingReasons)) {
      return { outcome: 'blocked', reason: 'noModel' };
    }

    const touchesSettings = touchesWorkerSettings(patch);
    const managedWorkflows = await this.requireManagedWorkflows();
    const management = this.requireManagement();
    let status = await managedWorkflows.getWorkflowStatus(registration.id, {
      spaceId,
      workflowIdSuffix: spaceId,
    });

    const isAlertTriageWorker = workerId === SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
    const isHuntWorker = workerId === SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID;

    // Validate the enable half before writing anything: a combined settings-and-enable PATCH
    // must not persist new settings (below) when the enable half is refused, or the operator
    // is left with a bumped revision and no way back to a consistent "not yet enabled" state.
    // `status.workflowId` is deterministic regardless of install state, so this can run first.
    if (isAlertTriageWorker && patch.enabled) {
      const blockedReason = await this.checkAlertAnalysisPreflight(request);
      if (blockedReason) {
        return { outcome: 'blocked', reason: blockedReason };
      }
    }

    const currentState = status.installed
      ? await managedWorkflows.getInstalledWorkflowState(status.workflowId, spaceId)
      : null;
    if (status.installed && !currentState) return { outcome: 'unavailable' };
    const requestedAccount = patch.settings?.serviceAccountId;
    const nextAccount =
      requestedAccount === undefined
        ? readServiceAccountId(currentState?.templateValues)
        : requestedAccount ?? undefined;
    const nextEnabled = patch.enabled ?? Boolean(status.enabled);
    if (nextEnabled && !nextAccount) {
      return { outcome: 'rejected', what: 'a worker that is enabled without a service account' };
    }

    // Validate settings (revision + patch) before Hunt supply ensure so a rejected
    // account/settings update cannot leave ingest/enrich/attribute already on.
    let pendingSettingsValues: ManagedWorkflowTemplateValues | null = null;
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
      pendingSettingsValues = applied.values;
    }

    // Hunt supply: hard-gate + ensure TI after request validation and before enabling
    // CTH so a failed ensure never leaves Hunt on without reports. If Hunt never ends up
    // enabled after this ensure, roll supply back (Restore only shows when Hunt is on).
    let huntSupplyEnsured = false;
    const rollbackHuntSupplyIfNeeded = async (): Promise<void> => {
      if (!huntSupplyEnsured || !this.threatIntelSupply) {
        return;
      }
      huntSupplyEnsured = false;
      try {
        await this.threatIntelSupply.teardownSupplyForSpace(spaceId, request);
      } catch (err) {
        this.logger.error(
          `Hunt Watch: threat intel supply rollback failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    };

    if (isHuntWorker && patch.enabled === true && this.threatIntelSupply) {
      try {
        await this.threatIntelSupply.assertHardGate(request);
        await this.threatIntelSupply.ensureSupplyForSpace(spaceId, request);
        huntSupplyEnsured = true;
      } catch (err) {
        if (err instanceof ThreatIntelSupplyHardGateError) {
          return { outcome: 'blocked', reason: 'huntSupplyPrerequisitesUnmet' };
        }
        if (err instanceof ThreatIntelSupplyNotInstalledError) {
          return { outcome: 'blocked', reason: 'huntSupplyNotInstalled' };
        }
        throw err;
      }
    }

    try {
      if (pendingSettingsValues) {
        await this.persistWorker(request, registration, {
          spaceId,
          workflowIdSuffix: spaceId,
          values: pendingSettingsValues,
        });
        status = await managedWorkflows.getWorkflowStatus(registration.id, {
          spaceId,
          workflowIdSuffix: spaceId,
        });
        if (!status.installed) {
          await rollbackHuntSupplyIfNeeded();
          return { outcome: 'unavailable' };
        }
        const persisted = await managedWorkflows.getInstalledWorkflowState(
          status.workflowId,
          spaceId
        );
        if (!persisted || !templateValuesEqual(persisted.templateValues, pendingSettingsValues)) {
          this.logger.error(
            `Worker "${registration.id}" settings write could not be confirmed after save`
          );
          await rollbackHuntSupplyIfNeeded();
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
          await this.persistWorker(request, registration, {
            spaceId,
            workflowIdSuffix: spaceId,
            values: registration.settings.createDefaultValues(),
          });
          status = await managedWorkflows.getWorkflowStatus(registration.id, {
            spaceId,
            workflowIdSuffix: spaceId,
          });
          if (!status.installed) {
            await rollbackHuntSupplyIfNeeded();
            return { outcome: 'unavailable' };
          }
        }

        await management.updateWorkflow(
          status.workflowId,
          { enabled: patch.enabled },
          spaceId,
          request
        );

        if (isHuntWorker && patch.enabled === true && this.threatIntelSupply) {
          // Hunt is on: do not roll supply back if later projection fails. Re-ensure so a
          // concurrent teardown in another space cannot leave this space hunting without
          // shared ingest/enrich (that other space ensured before its Hunt write finished).
          huntSupplyEnsured = false;
          try {
            await this.threatIntelSupply.ensureSupplyForSpace(spaceId, request);
          } catch (err) {
            this.logger.error(
              `Hunt Watch: threat intel supply re-ensure after enable failed: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        }

        if (isHuntWorker && !patch.enabled && this.threatIntelSupply) {
          try {
            await this.threatIntelSupply.teardownSupplyForSpace(spaceId, request);
          } catch (err) {
            // Hunt is already off; log and continue so disable still succeeds when TI
            // docs are missing or a global update races another space.
            this.logger.error(
              `Hunt Watch: threat intel supply teardown failed: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        }
      }
    } catch (err) {
      await rollbackHuntSupplyIfNeeded();
      throw err;
    }

    const agentLookup = await this.buildAgentLookup(request);
    const worker = await this.projectWorker(
      registration,
      spaceId,
      request,
      blockingReasons,
      agentLookup
    );
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

  private async projectWorker(
    registration: WorkerRegistration,
    spaceId: string,
    request: KibanaRequest,
    blockingReasons: WorkerBlockingReason[],
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
      blockingReasons,
      skills: projectSkillsFromDefinition(definition, agentLookupCallback),
    };
  }
}
