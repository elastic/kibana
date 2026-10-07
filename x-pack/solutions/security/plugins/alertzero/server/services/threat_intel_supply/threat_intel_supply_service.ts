/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import {
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import { evaluateHuntSupplyHardGate } from './hard_gate';
import {
  ThreatIntelSupplyHardGateError,
  ThreatIntelSupplyHuntDisabledError,
  ThreatIntelSupplyNotInstalledError,
  type ThreatIntelSupplyHardGate,
  type ThreatIntelSupplyStatus,
  type ThreatIntelSupplyWorkflowStatus,
} from './types';

const attributeWorkflowIdForSpace = (spaceId: string): string =>
  `${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID}-${spaceId}`;

export interface ThreatIntelSupplyServiceDeps {
  management: WatchWorkflowsManagementClient;
  managedWorkflows: Promise<PluginScopedManagedWorkflowsApi | undefined>;
  logger: Logger;
  getEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
  enumerateSpaceIds: () => Promise<readonly string[]>;
}

/**
 * Orchestrates threat-intel supply enablement for Hunt Watch: ensure-on when
 * Continuous Threat Hunt enables, last-consumer teardown for globals, status
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

  async ensureSupplyForSpace(spaceId: string, request: KibanaRequest): Promise<void> {
    await this.setWorkflowEnabled(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      GLOBAL_WORKFLOW_SPACE_ID,
      true,
      request
    );
    await this.setWorkflowEnabled(
      THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
      GLOBAL_WORKFLOW_SPACE_ID,
      true,
      request
    );
    await this.setWorkflowEnabled(
      attributeWorkflowIdForSpace(spaceId),
      spaceId,
      true,
      request
    );
  }

  async teardownSupplyForSpace(spaceId: string, request: KibanaRequest): Promise<void> {
    await this.setWorkflowEnabled(
      attributeWorkflowIdForSpace(spaceId),
      spaceId,
      false,
      request
    );

    const otherSpaceStillHunting = await this.isHuntEnabledInOtherSpace(spaceId);
    if (otherSpaceStillHunting) {
      return;
    }

    await this.setWorkflowEnabled(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      GLOBAL_WORKFLOW_SPACE_ID,
      false,
      request
    );
    await this.setWorkflowEnabled(
      THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
      GLOBAL_WORKFLOW_SPACE_ID,
      false,
      request
    );
  }

  /**
   * Re-ensures TI workflows while Hunt is already on. Rejects when hard-gate
   * fails or Hunt is off in this space (Restore is not a substitute for enable).
   */
  async restoreSupplyForSpace(spaceId: string, request: KibanaRequest): Promise<ThreatIntelSupplyStatus> {
    await this.assertHardGate(request);
    if (!(await this.isHuntEnabledInSpace(spaceId))) {
      throw new ThreatIntelSupplyHuntDisabledError();
    }
    await this.ensureSupplyForSpace(spaceId, request);
    return this.getSupplyStatus(spaceId, request);
  }

  async getSupplyStatus(spaceId: string, request: KibanaRequest): Promise<ThreatIntelSupplyStatus> {
    const [hardGate, huntEnabled, ingest, enrich, attribute] = await Promise.all([
      this.evaluateHardGate(request),
      this.isHuntEnabledInSpace(spaceId),
      this.readWorkflowStatus(
        THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
        GLOBAL_WORKFLOW_SPACE_ID,
        'ingest',
        'deployment',
        request
      ),
      this.readWorkflowStatus(
        THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
        GLOBAL_WORKFLOW_SPACE_ID,
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
    const otherSpaceHunting = !huntEnabled
      ? await this.isHuntEnabledInOtherSpace(spaceId)
      : false;

    if (!huntEnabled && otherSpaceHunting) {
      for (const row of workflows) {
        if (row.scope === 'deployment' && row.enabled) {
          row.inUseElsewhere = true;
        }
      }
    }

    const drift =
      huntEnabled &&
      workflows.some((row) => !row.installed || !row.enabled);

    return { workflows, hardGate, drift, huntEnabled };
  }

  private async setWorkflowEnabled(
    workflowId: string,
    spaceId: string,
    enabled: boolean,
    request: KibanaRequest
  ): Promise<void> {
    const existing = await this.deps.management.getWorkflow(workflowId, spaceId, request);
    if (!existing) {
      throw new ThreatIntelSupplyNotInstalledError(workflowId);
    }
    if (existing.enabled === enabled) {
      return;
    }
    await this.deps.management.updateWorkflow(workflowId, { enabled }, spaceId, request);
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
