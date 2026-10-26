/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IUiSettingsClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import {
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { ThreatIntelSupplyWorkflowInstaller } from '../../types';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import { evaluateHuntSupplyHardGate } from './hard_gate';
import { evaluateHuntModelTiers } from './hunt_model_tiers';
import { ThreatIntelSupplyHardGateError } from './threat_intel_supply_hard_gate_error';
import { ThreatIntelSupplyHuntDisabledError } from './threat_intel_supply_hunt_disabled_error';
import { ThreatIntelSupplyNotInstalledError } from './threat_intel_supply_not_installed_error';
import type {
  ThreatIntelSupplyHardGate,
  ThreatIntelSupplyStatus,
  ThreatIntelSupplyWorkflowStatus,
} from './types';

interface SupplyTarget {
  workflowId: string;
  workflowSpaceId: string;
  /** `deployment` workflows are shared by every space; `space` workflows belong to the Hunt space. */
  scope: 'deployment' | 'space';
}

const attributeWorkflowIdForSpace = (spaceId: string): string =>
  `${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID}-${spaceId}`;

export interface ThreatIntelSupplyServiceDeps {
  management: WatchWorkflowsManagementClient;
  managedWorkflows: Promise<PluginScopedManagedWorkflowsApi | undefined>;
  logger: Logger;
  getEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
  enumerateSpaceIds: () => Promise<readonly string[]>;
  /**
   * Lazily resolves the security_solution-owned installer. May be unset until
   * that plugin's `start()` registers it.
   */
  getWorkflowInstaller?: () => ThreatIntelSupplyWorkflowInstaller | undefined;
  /** Model-tier registry, for reporting where each Hunt tier gets its model. Optional plugin. */
  getSearchInferenceEndpoints?: () => SearchInferenceEndpointsPluginStart | undefined;
  /** The inference plugin is optional; this returns undefined without it, and every tier then reads unavailable. */
  getInference: () => InferenceServerStart | undefined;
  /** The requesting user's space-scoped settings, for the deployment default connector. */
  getUiSettingsClient: (request: KibanaRequest) => IUiSettingsClient;
}

/**
 * Orchestrates threat-intel supply enablement for Hunt Watch: ensure-on when
 * Continuous Threat Hunt enables, last-consumer teardown for the default-space
 * supply workflows, status
 * for the settings panel, and the ML/bootstrap hard-gate.
 */
export class ThreatIntelSupplyService {
  constructor(private readonly deps: ThreatIntelSupplyServiceDeps) {}

  private async requireManagedWorkflows(): Promise<PluginScopedManagedWorkflowsApi> {
    const managedWorkflows = await this.deps.managedWorkflows;
    if (!managedWorkflows) {
      throw new Error('Managed Workflows API is not available');
    }
    return managedWorkflows;
  }

  async evaluateHardGate(request: KibanaRequest): Promise<ThreatIntelSupplyHardGate> {
    const esClient = await this.deps.getEsClient(request);
    return evaluateHuntSupplyHardGate({ esClient, logger: this.deps.logger });
  }

  async assertHardGate(request: KibanaRequest): Promise<void> {
    const gate = await this.evaluateHardGate(request);
    if (!gate.ok) {
      throw new ThreatIntelSupplyHardGateError(gate.reasonCodes);
    }
  }

  /**
   * Turns on ingest, enrich and the space's attribute workflow. If any step throws,
   * the flips this call made are undone (deployment-scoped ones only when no other space hunts) so a failed
   * enable leaves supply as it was, then the original error is rethrown. The undo only applies
   * to the first enable: when Hunt is already on in this space, as on Restore, supply is left
   * as it is.
   */
  async ensureSupplyForSpace(spaceId: string, request: KibanaRequest): Promise<void> {
    const targets: SupplyTarget[] = [
      {
        workflowId: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
        workflowSpaceId: DEFAULT_SPACE_ID,
        scope: 'deployment',
      },
      {
        workflowId: THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
        workflowSpaceId: DEFAULT_SPACE_ID,
        scope: 'deployment',
      },
      {
        workflowId: attributeWorkflowIdForSpace(spaceId),
        workflowSpaceId: spaceId,
        scope: 'space',
      },
    ];
    const flipped: SupplyTarget[] = [];

    try {
      for (const target of targets) {
        const changed = await this.setWorkflowEnabled({
          ...target,
          enabled: true,
          request,
          huntSpaceId: spaceId,
          installIfMissing: true,
        });
        if (changed) {
          flipped.push(target);
        }
      }
    } catch (error) {
      await this.undoEnsure(flipped, spaceId, request);
      throw error;
    }
  }

  private async undoEnsure(
    flipped: readonly SupplyTarget[],
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    if (flipped.length === 0) {
      return;
    }

    // A concurrent request may have finished enabling Hunt in this space while this one
    // was stalled, and reverting would strip supply from a live Hunt. When that can't be
    // ruled out, leaving supply on is the safer failure, so the undo is skipped.
    try {
      if (await this.isHuntEnabledInSpace(spaceId)) {
        return;
      }
    } catch (checkError) {
      this.deps.logger.error(
        `Skipping threat intel supply undo for space '${spaceId}', could not check whether Hunt is enabled: ${
          checkError instanceof Error ? checkError.message : String(checkError)
        }`
      );
      return;
    }

    // A positive answer is cached: once another space hunts, no deployment-scoped workflow is undone. A negative
    // answer is rechecked before every deployment-scoped write, because another space can finish
    // enabling Hunt while an earlier undo is awaiting its update.
    let otherSpaceHunting = false;
    const isOtherSpaceHunting = async (): Promise<boolean> => {
      if (!otherSpaceHunting) {
        otherSpaceHunting = await this.isHuntEnabledInOtherSpace(spaceId);
      }
      return otherSpaceHunting;
    };

    for (const { workflowId, workflowSpaceId, scope } of [...flipped].reverse()) {
      try {
        if (scope === 'deployment' && (await isOtherSpaceHunting())) {
          continue;
        }
        await this.deps.management.updateWorkflow(
          workflowId,
          { enabled: false },
          workflowSpaceId,
          request
        );
      } catch (undoError) {
        this.deps.logger.error(
          `Failed to undo threat intel supply workflow ${workflowId} after a failed ensure: ${
            undoError instanceof Error ? undoError.message : String(undoError)
          }`
        );
      }
    }
  }

  async teardownSupplyForSpace(spaceId: string, request: KibanaRequest): Promise<void> {
    await this.setWorkflowEnabled({
      workflowId: attributeWorkflowIdForSpace(spaceId),
      workflowSpaceId: spaceId,
      enabled: false,
      request,
      huntSpaceId: spaceId,
      installIfMissing: false,
    });

    // Re-check immediately before touching the supply workflows so a concurrent Hunt enable in
    // another space is less likely to lose ingest/enrich after its ensure ran.
    if (await this.isHuntEnabledInOtherSpace(spaceId)) {
      return;
    }

    await this.setWorkflowEnabled({
      workflowId: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      workflowSpaceId: DEFAULT_SPACE_ID,
      enabled: false,
      request,
      huntSpaceId: spaceId,
      installIfMissing: false,
    });
    await this.setWorkflowEnabled({
      workflowId: THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
      workflowSpaceId: DEFAULT_SPACE_ID,
      enabled: false,
      request,
      huntSpaceId: spaceId,
      installIfMissing: false,
    });
  }

  /**
   * Re-ensures TI workflows while Hunt is already on. Rejects when hard-gate
   * fails or Hunt is off in this space (Restore is not a substitute for enable).
   */
  async restoreSupplyForSpace(
    spaceId: string,
    request: KibanaRequest
  ): Promise<ThreatIntelSupplyStatus> {
    await this.assertHardGate(request);
    if (!(await this.isHuntEnabledInSpace(spaceId))) {
      throw new ThreatIntelSupplyHuntDisabledError();
    }
    await this.ensureSupplyForSpace(spaceId, request);
    return this.getSupplyStatus(spaceId, request);
  }

  async getSupplyStatus(spaceId: string, request: KibanaRequest): Promise<ThreatIntelSupplyStatus> {
    const [hardGate, modelTiers, huntEnabled, ingest, enrich, attribute] = await Promise.all([
      this.evaluateHardGate(request),
      evaluateHuntModelTiers({
        inference: this.deps.getInference(),
        searchInferenceEndpoints: this.deps.getSearchInferenceEndpoints?.(),
        uiSettingsClient: this.deps.getUiSettingsClient(request),
        request,
        logger: this.deps.logger,
      }),
      this.isHuntEnabledInSpace(spaceId),
      this.readWorkflowStatus(
        THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
        DEFAULT_SPACE_ID,
        'ingest',
        'deployment',
        request
      ),
      this.readWorkflowStatus(
        THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
        DEFAULT_SPACE_ID,
        'enrich',
        'deployment',
        request
      ),
      this.readWorkflowStatus(
        attributeWorkflowIdForSpace(spaceId),
        spaceId,
        'attribute',
        'space',
        request
      ),
    ]);

    const workflows: ThreatIntelSupplyWorkflowStatus[] = [ingest, enrich, attribute];
    const otherSpaceHunting = !huntEnabled ? await this.isHuntEnabledInOtherSpace(spaceId) : false;

    if (!huntEnabled && otherSpaceHunting) {
      for (const row of workflows) {
        if (row.scope === 'deployment' && row.enabled) {
          row.inUseElsewhere = true;
        }
      }
    }

    const drift = huntEnabled && workflows.some((row) => !row.installed || !row.enabled);

    return { workflows, hardGate, drift, huntEnabled, modelTiers };
  }

  private async setWorkflowEnabled({
    workflowId,
    workflowSpaceId,
    enabled,
    request,
    huntSpaceId,
    installIfMissing,
  }: {
    workflowId: string;
    workflowSpaceId: string;
    enabled: boolean;
    request: KibanaRequest;
    /** Space whose Hunt enable/teardown triggered this call (used for owner install). */
    huntSpaceId: string;
    installIfMissing: boolean;
  }): Promise<boolean> {
    let existing = await this.deps.management.getWorkflow(workflowId, workflowSpaceId, request);
    if (!existing && installIfMissing) {
      const installer = this.deps.getWorkflowInstaller?.();
      if (installer) {
        this.deps.logger.info(
          `Threat intel supply workflow ${workflowId} is not installed; asking security_solution to install supply for space '${huntSpaceId}'`
        );
        await installer({ spaceId: huntSpaceId });
        existing = await this.deps.management.getWorkflow(workflowId, workflowSpaceId, request);
      }
    }
    if (!existing) {
      // Disable/teardown: missing doc is already off. Enable still needs install.
      if (!enabled) {
        return false;
      }
      throw new ThreatIntelSupplyNotInstalledError(workflowId);
    }
    if (existing.enabled === enabled) {
      return false;
    }
    await this.deps.management.updateWorkflow(workflowId, { enabled }, workflowSpaceId, request);
    return true;
  }

  private async readWorkflowStatus(
    workflowId: string,
    spaceId: string,
    key: ThreatIntelSupplyWorkflowStatus['key'],
    scope: ThreatIntelSupplyWorkflowStatus['scope'],
    request: KibanaRequest
  ): Promise<ThreatIntelSupplyWorkflowStatus> {
    const existing = await this.deps.management.getWorkflow(workflowId, spaceId, request);
    return {
      key,
      workflowId,
      scope,
      installed: existing != null,
      enabled: Boolean(existing?.enabled),
    };
  }

  private async isHuntEnabledInSpace(spaceId: string): Promise<boolean> {
    const managedWorkflows = await this.requireManagedWorkflows();
    const status = await managedWorkflows.getWorkflowStatus(
      SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
      { spaceId, workflowIdSuffix: spaceId }
    );
    return Boolean(status.installed && status.enabled);
  }

  private async isHuntEnabledInOtherSpace(excludeSpaceId: string): Promise<boolean> {
    const spaceIds = await this.deps.enumerateSpaceIds();
    for (const spaceId of spaceIds) {
      if (spaceId === excludeSpaceId) {
        continue;
      }
      if (await this.isHuntEnabledInSpace(spaceId)) {
        return true;
      }
    }
    return false;
  }
}
