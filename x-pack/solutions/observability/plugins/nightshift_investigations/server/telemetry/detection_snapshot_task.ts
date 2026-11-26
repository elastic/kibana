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
  throwUnrecoverableError,
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
const MS_PER_DAY = 24 * 60 * 60 * 1000;
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
  listConnectors: (
    spaceId: string
  ) => Promise<Array<{ actionTypeId: string; isInboundEventsEnabled?: boolean }>>;
  getAlertActivity: (
    spaceId: string,
    connectorSources: readonly string[],
    signal: AbortSignal
  ) => Promise<
    Pick<
      DetectionSnapshotEvent,
      'external_sources_active_24h' | 'external_alerts_24h' | 'significant_events_24h'
    > & { activeConnectorSources: string[] }
  >;
  /** `undefined` when Semantic Memory is disabled. */
  countMemoryPages: (spaceId: string, signal: AbortSignal) => Promise<number | undefined>;
  getSettings: (
    spaceId: string
  ) => Promise<Pick<DetectionSnapshotEvent, 'custom_context_snippets' | 'sandbox_allowlist_hosts'>>;
  /** `undefined` when the Significant Events plugin is not installed. */
  getKnowledgeCounts: (
    spaceId: string,
    signal: AbortSignal
  ) => Promise<DetectionSnapshotKnowledgeCounts | undefined>;
}

export interface DetectionSnapshotTaskDeps {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  sources: DetectionSnapshotSources;
  logger: Logger;
}

// Connector types a managed workflow translates into alerts, mapped to the source it writes.
const EXTERNAL_ALERT_SOURCE_BY_CONNECTOR_TYPE_ID: Readonly<Record<string, string>> = {
  '.datadog': 'datadog',
};

const countConnectorsByType = (
  connectors: ReadonlyArray<{ actionTypeId: string }>
): DetectionSnapshotEvent['connectors_by_type'] => {
  const counts = new Map<string, number>();
  for (const { actionTypeId } of connectors) {
    counts.set(actionTypeId, (counts.get(actionTypeId) ?? 0) + 1);
  }
  return [...counts].map(([connector_type, count]) => ({ connector_type, count }));
};

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

type TriggerKind = SnapshotAutomation['trigger']['rows'][number]['kind'];

const countByTrigger = (automations: readonly SnapshotAutomation[], kind: TriggerKind): number =>
  automations.filter(({ trigger }) => trigger.rows.some((row) => row.kind === kind)).length;

const collectSpaceSnapshot = async (
  spaceId: string,
  sources: DetectionSnapshotSources,
  logger: Logger,
  signal: AbortSignal
): Promise<DetectionSnapshotEvent> => {
  const [automations, connectors] = await Promise.all([
    sources.listAutomations(spaceId),
    sources.listConnectors(spaceId),
  ]);
  const connectorSources = connectors.flatMap(({ actionTypeId, isInboundEventsEnabled }) => {
    const source = EXTERNAL_ALERT_SOURCE_BY_CONNECTOR_TYPE_ID[actionTypeId];
    return source && isInboundEventsEnabled ? [source] : [];
  });
  const [
    rules,
    { activeConnectorSources, ...alertActivity },
    memoryPages,
    settings,
    knowledgeCounts,
  ] = await Promise.all([
    countRules(spaceId, toRuleMatchers(automations), sources.findEligibleRules, signal),
    sources.getAlertActivity(spaceId, connectorSources, signal),
    sources.countMemoryPages(spaceId, signal),
    sources.getSettings(spaceId),
    // Optional in the event, so a failure omits the counts rather than the snapshot.
    sources.getKnowledgeCounts(spaceId, signal).catch((error) => {
      if (signal.aborted) throw error;
      logger.warn(`Failed to read the knowledge counts of space [${spaceId}]: ${error.message}`);
      return undefined;
    }),
  ]);

  const enabledAutomations = automations.filter(({ isEnabled }) => isEnabled);

  return {
    space_id: spaceId,
    ...rules,
    automations_total: automations.length,
    automations_enabled: enabledAutomations.length,
    connectors_configured: connectors.length,
    connectors_by_type: countConnectorsByType(connectors),
    automations_alert_total: countByTrigger(automations, 'alert'),
    automations_alert_enabled: countByTrigger(enabledAutomations, 'alert'),
    automations_schedule_total: countByTrigger(automations, 'schedule'),
    automations_schedule_enabled: countByTrigger(enabledAutomations, 'schedule'),
    automations_slack_total: countByTrigger(automations, 'slack'),
    automations_slack_enabled: countByTrigger(enabledAutomations, 'slack'),
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

// A fixed order drops the same tail spaces on every timeout, and a timed-out run saves no task state.
const rotateDaily = (spaceIds: readonly string[]): string[] => {
  const sorted = [...spaceIds].sort();
  const offset = Math.floor(Date.now() / MS_PER_DAY) % Math.max(sorted.length, 1);
  return [...sorted.slice(offset), ...sorted.slice(0, offset)];
};

/** Reports one snapshot event per space that has Nightshift set up. */
export const reportDetectionSnapshots = async (
  { analytics, sources, logger }: DetectionSnapshotTaskDeps,
  signal: AbortSignal
): Promise<void> => {
  const spaceIds = rotateDaily(await sources.listSpaceIds());
  for (const [index, spaceId] of spaceIds.entries()) {
    try {
      signal.throwIfAborted();
      const snapshot = await collectSpaceSnapshot(spaceId, sources, logger, signal);
      // Do not report an event when cancellation races completed reads.
      signal.throwIfAborted();
      analytics.reportEvent(NIGHTSHIFT_DETECTION_SNAPSHOT_EVENT, snapshot);
    } catch (error) {
      if (signal.aborted) {
        logger.warn(
          `Detection snapshot aborted: ${spaceIds.length - index} of ${
            spaceIds.length
          } space(s) not reported`
        );
        return;
      }
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
      cost: TaskCost.Normal,
      priority: TaskPriority.Maintenance,
      createTaskRunner: ({ taskInstance, fakeRequest, signal }) => ({
        async run() {
          if (!fakeRequest) {
            // No retry can add credentials; the next Nightshift setup reschedules the removed task.
            return throwUnrecoverableError(
              new Error('Detection snapshot telemetry task has no user credentials')
            );
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
