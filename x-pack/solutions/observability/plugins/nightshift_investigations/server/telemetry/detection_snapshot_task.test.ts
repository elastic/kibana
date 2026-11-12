/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { NIGHTSHIFT_DETECTION_SNAPSHOT_EVENT } from './detection_snapshot_event';
import {
  reportDetectionSnapshots,
  type DetectionSnapshotSources,
  type SnapshotAutomation,
} from './detection_snapshot_task';
import type { SnapshotRule } from './is_rule_wired';

const automation = (
  row: SnapshotAutomation['trigger']['rows'][number],
  isEnabled = true
): SnapshotAutomation => ({ isEnabled, trigger: { rows: [row] } });

const setup = ({
  automations = [],
  rules = [],
  spaceIds = ['default'],
}: {
  automations?: SnapshotAutomation[];
  rules?: SnapshotRule[];
  spaceIds?: string[];
} = {}) => {
  const sources: jest.Mocked<DetectionSnapshotSources> = {
    listSpaceIds: jest.fn().mockResolvedValue(spaceIds),
    listAutomations: jest.fn().mockResolvedValue(automations),
    findEligibleRules: jest.fn(async (_spaceId, { page, perPage }) => ({
      rules: rules.slice((page - 1) * perPage, page * perPage),
      total: rules.length,
    })),
    countExternalConnectors: jest.fn().mockResolvedValue(1),
    getAlertActivity: jest.fn().mockResolvedValue({
      external_sources_active_24h: 2,
      external_alerts_24h: 7,
      significant_events_24h: 3,
    }),
    countMemoryPages: jest.fn().mockResolvedValue(undefined),
    getSettings: jest
      .fn()
      .mockResolvedValue({ custom_context_snippets: 4, sandbox_allowlist_hosts: 5 }),
    getKnowledgeCounts: jest.fn().mockResolvedValue(undefined),
  };
  const analytics = { reportEvent: jest.fn() };
  const logger = loggingSystemMock.createLogger();
  const run = (signal = new AbortController().signal) =>
    reportDetectionSnapshots({ analytics, sources, logger }, signal);
  return { sources, analytics, run };
};

describe('reportDetectionSnapshots', () => {
  it('counts the rules enabled automations match as wired in', async () => {
    const { analytics, run } = setup({
      automations: [
        automation({ kind: 'alert', tags: ['payments'] }),
        automation({ kind: 'alert', ruleNames: ['disk full'] }, false),
      ],
      rules: [
        { name: 'checkout latency', tags: ['payments'] },
        { name: 'disk full', tags: [] },
        { name: 'refund errors', tags: ['payments'] },
      ],
    });

    await run();

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_DETECTION_SNAPSHOT_EVENT, {
      space_id: 'default',
      rules_eligible: 3,
      rules_wired_in: 2,
      rules_truncated: false,
      automations_total: 2,
      automations_enabled: 1,
      external_connectors_configured: 1,
      external_sources_active_24h: 2,
      external_alerts_24h: 7,
      significant_events_24h: 3,
      memory_enabled: false,
      custom_context_snippets: 4,
      sandbox_allowlist_hosts: 5,
    });
  });

  it('skips the rule scan when an automation has no rule filter', async () => {
    const { sources, analytics, run } = setup({
      automations: [automation({ kind: 'alert', severities: ['critical'] })],
      rules: Array.from({ length: 3 }, (_, index) => ({ name: `rule ${index}`, tags: [] })),
    });

    await run();

    expect(analytics.reportEvent.mock.calls[0][1]).toMatchObject({
      rules_eligible: 3,
      rules_wired_in: 3,
    });
    expect(sources.findEligibleRules).toHaveBeenCalledTimes(1);
  });

  it('marks the snapshot truncated past the scan limit', async () => {
    const { sources, analytics, run } = setup({
      automations: [automation({ kind: 'alert', tags: ['payments'] })],
    });
    sources.findEligibleRules.mockImplementation(async (_spaceId, { perPage }) => ({
      rules: Array.from({ length: perPage }, () => ({ name: 'rule', tags: ['payments'] })),
      total: 10_001,
    }));

    await run();

    expect(analytics.reportEvent.mock.calls[0][1]).toMatchObject({
      rules_eligible: 10_001,
      rules_wired_in: 10_000,
      rules_truncated: true,
    });
  });

  it('adds memory and knowledge counts when they are available', async () => {
    const { sources, analytics, run } = setup();
    sources.countMemoryPages.mockResolvedValue(0);
    sources.getKnowledgeCounts.mockResolvedValue({
      knowledge_indicators_features: 10,
      knowledge_indicators_queries: 6,
      significant_event_rules: 4,
      significant_event_rules_active: 3,
    });

    await run();

    expect(analytics.reportEvent.mock.calls[0][1]).toMatchObject({
      memory_enabled: true,
      memory_pages: 0,
      knowledge_indicators_features: 10,
      significant_event_rules_active: 3,
    });
  });

  it('skips a space whose read fails and reports the others', async () => {
    const { sources, analytics, run } = setup({ spaceIds: ['default', 'marketing'] });
    sources.getAlertActivity.mockRejectedValueOnce(new Error('shard failure'));

    await run();

    expect(analytics.reportEvent.mock.calls.map(([, event]) => event.space_id)).toEqual([
      'marketing',
    ]);
  });

  it('reports nothing once Task Manager aborts the run', async () => {
    const { analytics, run } = setup();
    const controller = new AbortController();
    controller.abort();

    await expect(run(controller.signal)).rejects.toThrow();
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });
});
