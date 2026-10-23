/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutLogger } from '@kbn/scout-oblt';
import { resolveAgentSnapshotTag } from './agent_stack';

const createMockLog = (): ScoutLogger =>
  ({
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as ScoutLogger);

describe('resolveAgentSnapshotTag', () => {
  it('returns the Kibana snapshot tag when both images exist on the registry', async () => {
    const log = createMockLog();
    const fetchSnapshotVersions = jest.fn();

    const tag = await resolveAgentSnapshotTag('9.7.0', log, 'complete', {
      hasManifest: () => true,
      fetchSnapshotVersions,
    });

    expect(tag).toBe('9.7.0-SNAPSHOT');
    expect(fetchSnapshotVersions).not.toHaveBeenCalled();
    expect(log.warning).not.toHaveBeenCalled();
  });

  it('preserves an existing -SNAPSHOT suffix on the Kibana version', async () => {
    const log = createMockLog();

    const tag = await resolveAgentSnapshotTag('9.7.0-SNAPSHOT', log, 'agent', {
      hasManifest: (image) =>
        image === 'docker.elastic.co/elastic-agent/elastic-agent:9.7.0-SNAPSHOT',
    });

    expect(tag).toBe('9.7.0-SNAPSHOT');
  });

  it('falls back to the highest published snapshot <= Kibana version when the current minor is missing', async () => {
    const log = createMockLog();
    const available = new Set([
      'docker.elastic.co/elastic-agent/elastic-agent:9.6.0-SNAPSHOT',
      'docker.elastic.co/elastic-agent/elastic-agent-complete:9.6.0-SNAPSHOT',
      'docker.elastic.co/elastic-agent/elastic-agent:9.5.6-SNAPSHOT',
      'docker.elastic.co/elastic-agent/elastic-agent-complete:9.5.6-SNAPSHOT',
    ]);

    const tag = await resolveAgentSnapshotTag('9.7.0', log, 'complete', {
      hasManifest: (image) => available.has(image),
      fetchSnapshotVersions: async () => ['8.19.24-SNAPSHOT', '9.5.6-SNAPSHOT', '9.6.0-SNAPSHOT'],
    });

    expect(tag).toBe('9.6.0-SNAPSHOT');
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('9.6.0-SNAPSHOT'));
  });

  it('requires elastic-agent-complete to exist when agentImage is complete', async () => {
    const log = createMockLog();
    const available = new Set([
      // 9.7.0 has elastic-agent but not elastic-agent-complete yet
      'docker.elastic.co/elastic-agent/elastic-agent:9.7.0-SNAPSHOT',
      'docker.elastic.co/elastic-agent/elastic-agent:9.6.0-SNAPSHOT',
      'docker.elastic.co/elastic-agent/elastic-agent-complete:9.6.0-SNAPSHOT',
    ]);

    const completeTag = await resolveAgentSnapshotTag('9.7.0', log, 'complete', {
      hasManifest: (image) => available.has(image),
      fetchSnapshotVersions: async () => ['9.6.0-SNAPSHOT', '9.7.0-SNAPSHOT'],
    });
    expect(completeTag).toBe('9.6.0-SNAPSHOT');

    const agentOnlyTag = await resolveAgentSnapshotTag('9.7.0', log, 'agent', {
      hasManifest: (image) => available.has(image),
      fetchSnapshotVersions: async () => ['9.6.0-SNAPSHOT', '9.7.0-SNAPSHOT'],
    });
    expect(agentOnlyTag).toBe('9.7.0-SNAPSHOT');
  });

  it('does not select a snapshot newer than the Kibana branch under test', async () => {
    const log = createMockLog();
    const available = new Set([
      'docker.elastic.co/elastic-agent/elastic-agent:8.19.23-SNAPSHOT',
      'docker.elastic.co/elastic-agent/elastic-agent:9.6.0-SNAPSHOT',
    ]);

    const tag = await resolveAgentSnapshotTag('8.19.24', log, 'agent', {
      hasManifest: (image) => available.has(image),
      fetchSnapshotVersions: async () => ['8.19.23-SNAPSHOT', '9.6.0-SNAPSHOT'],
    });

    expect(tag).toBe('8.19.23-SNAPSHOT');
  });

  it('falls back to the previous minor when artifacts-api fails', async () => {
    const log = createMockLog();
    const available = new Set(['docker.elastic.co/elastic-agent/elastic-agent:9.6.0-SNAPSHOT']);

    const tag = await resolveAgentSnapshotTag('9.7.0', log, 'agent', {
      hasManifest: (image) => available.has(image),
      fetchSnapshotVersions: async () => {
        throw new Error('network error');
      },
    });

    expect(tag).toBe('9.6.0-SNAPSHOT');
  });
});
