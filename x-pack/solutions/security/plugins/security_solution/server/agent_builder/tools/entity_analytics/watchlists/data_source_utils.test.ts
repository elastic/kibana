/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import {
  previewStoreSource,
  formatStorePreviewMessage,
  previewIndexSource,
  formatIndexPreviewMessage,
  toDataSourceSummary,
  fingerprintDataSource,
} from './data_source_utils';

describe('data_source_utils', () => {
  describe('previewStoreSource / formatStorePreviewMessage', () => {
    it('returns total from the entity store search', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 47, relation: 'eq' },
          hits: [
            { _source: { entity: { id: 'host:web-01' } } },
            { _source: { entity: { id: 'host:web-02' } } },
          ],
        },
      } as never);

      const result = await previewStoreSource({
        esClient,
        namespace: 'default',
        queryRule: 'host.os.name: "Ubuntu*"',
      });

      expect(result).toEqual({ total: 47 });
      expect(formatStorePreviewMessage(result.total)).toContain('47 entities');
    });

    it('formats a zero-match message distinctly', () => {
      const message = formatStorePreviewMessage(0);
      expect(message).toContain('0 entities');
      expect(message).toMatch(/double-check/i);
    });

    it('uses singular wording for a single match', () => {
      const message = formatStorePreviewMessage(1);
      expect(message).toMatch(/1 entity\b/);
    });
  });

  describe('previewIndexSource / formatIndexPreviewMessage', () => {
    it('returns doc count and distinct identifier cardinality', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValueOnce({
        hits: { total: { value: 1204, relation: 'eq' }, hits: [] },
        aggregations: { identifiers: { value: 38 } },
      } as never);

      const result = await previewIndexSource({
        esClient,
        indexPattern: 'logs-okta*',
        identifierField: 'user.name',
        queryRule: 'event.action: "user.session.start"',
        range: { start: 'now-10d', end: 'now' },
      });

      expect(result).toEqual({ docCount: 1204, distinctIdentifierCount: 38 });
      const message = formatIndexPreviewMessage(result, {
        identifierField: 'user.name',
        range: { start: 'now-10d', end: 'now' },
      });
      expect(message).toContain('1204 documents');
      expect(message).toContain('38 distinct `user.name`');
    });

    it('formats a zero-match message distinctly', () => {
      const message = formatIndexPreviewMessage(
        { docCount: 0, distinctIdentifierCount: 0 },
        { identifierField: 'user.name', range: { start: 'now-10d', end: 'now' } }
      );
      expect(message).toContain('0 documents');
      expect(message).toMatch(/double-check/i);
    });
  });
});

const buildSource = (overrides: Partial<MonitoringEntitySource> = {}) =>
  ({
    id: 'src-1',
    type: 'store',
    name: 'wl-store',
    queryRule: 'host.os.name: "Ubuntu*"',
    ...overrides,
  } as MonitoringEntitySource);

describe('toDataSourceSummary', () => {
  it('drops credentials and internal bookkeeping fields', () => {
    const summary = toDataSourceSummary(
      buildSource({
        type: 'index',
        indexPattern: 'logs-*',
        identifierField: 'user.name',
        apiKeyId: 'secret-id',
        apiKey: 'secret-value',
        managedVersion: 2,
        matchersModifiedByUser: true,
      } as Partial<MonitoringEntitySource>)
    );

    expect(summary).not.toHaveProperty('apiKeyId');
    expect(summary).not.toHaveProperty('apiKey');
    expect(summary).not.toHaveProperty('managedVersion');
    expect(summary).not.toHaveProperty('matchersModifiedByUser');
  });

  it('reduces the api key to a boolean for index sources', () => {
    expect(toDataSourceSummary(buildSource({ type: 'index', apiKeyId: 'abc' })).hasApiKey).toBe(
      true
    );
    expect(toDataSourceSummary(buildSource({ type: 'index' })).hasApiKey).toBe(false);
  });

  it('omits index-only and integration-only fields for store sources', () => {
    const summary = toDataSourceSummary(buildSource());

    expect(summary).not.toHaveProperty('hasApiKey');
    expect(summary).not.toHaveProperty('identifierField');
    expect(summary).not.toHaveProperty('integrationName');
  });

  it('defaults managed and enabled rather than leaking undefined', () => {
    expect(toDataSourceSummary(buildSource())).toMatchObject({ managed: false, enabled: true });
  });
});

describe('fingerprintDataSource', () => {
  it('treats an absent source as its own approved state', () => {
    expect(fingerprintDataSource(undefined)).toBe('none');
  });

  it('is stable for an unchanged source', () => {
    expect(fingerprintDataSource(buildSource())).toBe(fingerprintDataSource(buildSource()));
  });

  it('changes when the query changes', () => {
    expect(fingerprintDataSource(buildSource({ queryRule: 'a: b' }))).not.toBe(
      fingerprintDataSource(buildSource({ queryRule: 'c: d' }))
    );
  });

  it('changes when the source is replaced by a different one', () => {
    expect(fingerprintDataSource(buildSource({ id: 'src-1' }))).not.toBe(
      fingerprintDataSource(buildSource({ id: 'src-2' }))
    );
  });

  it('ignores fields the confirmation never showed', () => {
    expect(
      fingerprintDataSource(buildSource({ apiKeyId: 'rotated' } as Partial<MonitoringEntitySource>))
    ).toBe(fingerprintDataSource(buildSource()));
  });

  it('changes when the source is disabled while the confirmation was open', () => {
    expect(
      fingerprintDataSource(buildSource({ enabled: true } as Partial<MonitoringEntitySource>))
    ).not.toBe(
      fingerprintDataSource(buildSource({ enabled: false } as Partial<MonitoringEntitySource>))
    );
  });
});
