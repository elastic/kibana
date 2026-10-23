/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveAgentSnapshotTag } from './resolve_agent_snapshot_tag';

const AGENT = 'docker.elastic.co/elastic-agent/elastic-agent';
const COMPLETE = 'docker.elastic.co/elastic-agent/elastic-agent-complete';

const createLog = () => ({ warning: jest.fn() });

describe('resolveAgentSnapshotTag', () => {
  it('returns the Kibana snapshot tag when the images are published', async () => {
    const log = createLog();
    const fetchSnapshotVersions = jest.fn();

    const tag = await resolveAgentSnapshotTag('9.7.0', log, 'complete', {
      hasManifest: () => true,
      fetchSnapshotVersions,
    });

    expect(tag).toBe('9.7.0-SNAPSHOT');
    expect(fetchSnapshotVersions).not.toHaveBeenCalled();
    expect(log.warning).not.toHaveBeenCalled();
  });

  it('keeps an existing -SNAPSHOT suffix', async () => {
    const tag = await resolveAgentSnapshotTag('9.7.0-SNAPSHOT', createLog(), 'agent', {
      hasManifest: (image) => image === `${AGENT}:9.7.0-SNAPSHOT`,
    });

    expect(tag).toBe('9.7.0-SNAPSHOT');
  });

  it('falls back to the highest published snapshot <= the Kibana version', async () => {
    const log = createLog();
    const published = new Set([
      `${AGENT}:9.6.0-SNAPSHOT`,
      `${COMPLETE}:9.6.0-SNAPSHOT`,
      `${AGENT}:9.5.6-SNAPSHOT`,
      `${COMPLETE}:9.5.6-SNAPSHOT`,
    ]);

    const tag = await resolveAgentSnapshotTag('9.7.0', log, 'complete', {
      hasManifest: (image) => published.has(image),
      fetchSnapshotVersions: async () => ['8.19.24-SNAPSHOT', '9.5.6-SNAPSHOT', '9.6.0-SNAPSHOT'],
    });

    expect(tag).toBe('9.6.0-SNAPSHOT');
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('9.6.0-SNAPSHOT'));
  });

  it('requires elastic-agent-complete only for the complete image', async () => {
    const published = new Set([
      `${AGENT}:9.7.0-SNAPSHOT`,
      `${AGENT}:9.6.0-SNAPSHOT`,
      `${COMPLETE}:9.6.0-SNAPSHOT`,
    ]);
    const deps = {
      hasManifest: (image: string) => published.has(image),
      fetchSnapshotVersions: async () => ['9.6.0-SNAPSHOT', '9.7.0-SNAPSHOT'],
    };

    expect(await resolveAgentSnapshotTag('9.7.0', createLog(), 'complete', deps)).toBe(
      '9.6.0-SNAPSHOT'
    );
    expect(await resolveAgentSnapshotTag('9.7.0', createLog(), 'agent', deps)).toBe(
      '9.7.0-SNAPSHOT'
    );
  });

  it('never selects a snapshot newer than the Kibana version', async () => {
    const published = new Set([`${AGENT}:8.19.23-SNAPSHOT`, `${AGENT}:9.6.0-SNAPSHOT`]);

    const tag = await resolveAgentSnapshotTag('8.19.24', createLog(), 'agent', {
      hasManifest: (image) => published.has(image),
      fetchSnapshotVersions: async () => ['8.19.23-SNAPSHOT', '9.6.0-SNAPSHOT'],
    });

    expect(tag).toBe('8.19.23-SNAPSHOT');
  });

  it('falls back to the previous minor when the artifacts API fails', async () => {
    const tag = await resolveAgentSnapshotTag('9.7.0', createLog(), 'agent', {
      hasManifest: (image) => image === `${AGENT}:9.6.0-SNAPSHOT`,
      fetchSnapshotVersions: async () => {
        throw new Error('network error');
      },
    });

    expect(tag).toBe('9.6.0-SNAPSHOT');
  });

  it('returns the preferred tag when nothing else is published', async () => {
    const tag = await resolveAgentSnapshotTag('9.7.0', createLog(), 'agent', {
      hasManifest: () => false,
      fetchSnapshotVersions: async () => [],
    });

    expect(tag).toBe('9.7.0-SNAPSHOT');
  });
});
