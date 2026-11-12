/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, KibanaRequest, Logger } from '@kbn/core/server';
import {
  TaskCost,
  TaskPriority,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { NightshiftAutomationAttributes } from '../lib/automations/types';
import {
  NIGHTSHIFT_DETECTION_SNAPSHOT_EVENT,
  type DetectionSnapshotEvent,
  type DetectionSnapshotKnowledgeCounts,
} from './detection_snapshot_event';
import {
  isRuleWired,
  matchesEveryRule,
  toRuleMatchers,
  type RuleMatcher,
  type SnapshotRule,
} from './is_rule_wired';

export const DETECTION_SNAPSHOT_TASK_TYPE = 'nightshiftInvestigations:detectionSnapshotTelemetry';
export const DETECTION_SNAPSHOT_TASK_ID = 'nightshift-investigations:detection-snapshot-telemetry';
const TASK_INTERVAL = '24h';
const TASK_TIMEOUT = '10m';
const RULES_PAGE_SIZE = 500;
// The saved objects result window.
const MAX_SCANNED_RULES = 10_000;

export type SnapshotAutomation = Pick<
  NightshiftAutomationAttributes,
  'isEnabled' | 'workflowId' | 'trigger'
>;

export interface DetectionSnapshotSources {
  listSpaceIds: () => Promise<string[]>;
  listAutomations: (spaceId: string) => Promise<SnapshotAutomation[]>;
  /** Enabled Alerting v2 rules of kind `alert`, in a stable order. */
  findEligibleRules: (
    spaceId: string,
    page: { page: number; perPage: number }
  ) => Promise<{ rules: SnapshotRule[]; total: number }>;
  /** One entry per connector, so sources repeat. */
  listExternalConnectorSources: (spaceId: string) => Promise<string[]>;
  getAlertActivity: (
    spaceId: string,
    connectorSources: readonly string[]
  ) => Promise<
    Pick<
      DetectionSnapshotEvent,
      'external_sources_active_24h' | 'external_alerts_24h' | 'significant_events_24h'
    > & { activeConnectorSources: string[] }
  >;
  /** `undefined` when Semantic Memory is disabled. */
  countMemoryPages: (spaceId: string) => Promise<number | undefined>;
  getSettings: (
    spaceId: string
  ) => Promise<Pick<DetectionSnapshotEvent, 'custom_context_snippets' | 'sandbox_allowlist_hosts'>>;
  /** `undefined` when the Significant Events plugin is not installed. */
  getKnowledgeCounts: (spaceId: string) => Promise<DetectionSnapshotKnowledgeCounts | undefined>;
}

export interface DetectionSnapshotTaskDeps {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  sources: DetectionSnapshotSources;
  logger: Logger;
}

const countRules = async (
  spaceId: string,
  matchers: readonly RuleMatcher[],
  findEligibleRules: DetectionSnapshotSources['findEligibleRules'],
  signal: AbortSignal
): Promise<
  Pick<DetectionSnapshotEvent, 'rules_eligible' | 'rules_wired_in' | 'rules_truncated'>
> => {
  // No scan needed when nothing or everything is wired.
  if (matchers.length === 0 || matchers.some(matchesEveryRule)) {
    const { total } = await findEligibleRules(spaceId, { page: 1, perPage: 1 });
    return {
      rules_eligible: total,
      rules_wired_in: matchers.length === 0 ? 0 : total,
      rules_truncated: false,
    };
  }

  let eligible = 0;
  let scanned = 0;
  // Pages are sorted by name alone, so rules that share a name can repeat across pages.
  const wiredIn = new Set<string>();
  for (let page = 1; scanned < MAX_SCANNED_RULES; page++) {
    signal.throwIfAborted();
    const { rules, total } = await findEligibleRules(spaceId, { page, perPage: RULES_PAGE_SIZE });
    eligible = total;
    scanned += rules.length;
    for (const rule of rules) {
      if (isRuleWired(rule, matchers)) wiredIn.add(rule.id);
    }
    if (rules.length < RULES_PAGE_SIZE) break;
  }
  return {
    rules_eligible: eligible,
    rules_wired_in: wiredIn.size,
    rules_truncated: eligible > MAX_SCANNED_RULES,
  };
};

const collectSpaceSnapshot = async (
  spaceId: string,
  sources: DetectionSnapshotSources,
  signal: AbortSignal
): Promise<DetectionSnapshotEvent> => {
  const [automations, connectorSources] = await Promise.all([
    sources.listAutomations(spaceId),
    sources.listExternalConnectorSources(spaceId),
  ]);
  const [
    rules,
    { activeConnectorSources, ...alertActivity },
    memoryPages,
    settings,
    knowledgeCounts,
  ] = await Promise.all([
    countRules(spaceId, toRuleMatchers(automations), sources.findEligibleRules, signal),
    sources.getAlertActivity(spaceId, connectorSources),
    sources.countMemoryPages(spaceId),
    sources.getSettings(spaceId),
    sources.getKnowledgeCounts(spaceId),
  ]);

  return {
    space_id: spaceId,
    ...rules,
    automations_total: automations.length,
    automations_enabled: automations.filter(({ isEnabled }) => isEnabled).length,
    external_connectors_configured: connectorSources.length,
    external_connectors_active_24h: connectorSources.filter((source) =>
      activeConnectorSources.includes(source)
    ).length,
    ...alertActivity,
    memory_enabled: memoryPages !== undefined,
    ...(memoryPages !== undefined ? { memory_pages: memoryPages } : {}),
    ...settings,
    ...knowledgeCounts,
  };
};

/** Reports one snapshot event per space that has Nightshift set up. */
export const reportDetectionSnapshots = async (
  { analytics, sources, logger }: DetectionSnapshotTaskDeps,
  signal: AbortSignal
): Promise<void> => {
  const spaceIds = await sources.listSpaceIds();
  for (const spaceId of spaceIds) {
    signal.throwIfAborted();
    try {
      const snapshot = await collectSpaceSnapshot(spaceId, sources, signal);
      // Do not report an event when cancellation races completed reads.
      signal.throwIfAborted();
      analytics.reportEvent(NIGHTSHIFT_DETECTION_SNAPSHOT_EVENT, snapshot);
    } catch (error) {
      if (signal.aborted) throw error;
      // A partial snapshot would read as zeros, so a space that fails reports nothing this run.
      logger.warn(`Failed to snapshot space [${spaceId}]: ${error.message}`);
    }
  }
  logger.debug(`Reported the detection snapshot of ${spaceIds.length} space(s)`);
};

export const registerDetectionSnapshotTask = ({
  taskManager,
  getDeps,
}: {
  taskManager: TaskManagerSetupContract;
  getDeps: (request: KibanaRequest) => Promise<DetectionSnapshotTaskDeps>;
}): void => {
  taskManager.registerTaskDefinitions({
    [DETECTION_SNAPSHOT_TASK_TYPE]: {
      title: 'Nightshift - daily detection snapshot telemetry',
      description:
        'Reports the current per-space counts of rules, automations, alert sources and knowledge via EBT.',
      timeout: TASK_TIMEOUT,
      maxAttempts: 1,
      cost: TaskCost.Normal,
      priority: TaskPriority.Maintenance,
      createTaskRunner: ({ taskInstance, fakeRequest, signal }) => ({
        async run() {
          if (!fakeRequest) {
            throw new Error('Detection snapshot telemetry task has no user credentials');
          }
          await reportDetectionSnapshots(await getDeps(fakeRequest), signal);
          return { state: taskInstance.state };
        },
      }),
    },
  });
};

export const scheduleDetectionSnapshotTask = async (
  taskManager: TaskManagerStartContract,
  request: KibanaRequest
): Promise<void> => {
  const task = {
    id: DETECTION_SNAPSHOT_TASK_ID,
    taskType: DETECTION_SNAPSHOT_TASK_TYPE,
    schedule: { interval: TASK_INTERVAL },
    params: {},
    state: {},
    scope: ['nightshiftInvestigations'],
  };
  await taskManager.ensureScheduled(task, { request, regenerateApiKey: true });
};

/** Removing the task also invalidates the API key it was scheduled with. */
export const removeDetectionSnapshotTask = async (
  taskManager: TaskManagerStartContract
): Promise<void> => {
  await taskManager.removeIfExists(DETECTION_SNAPSHOT_TASK_ID);
};
