/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { reconcileSourceCatalog } from './reconcile_source_catalog';

const request = {} as KibanaRequest;

const makeSource = (overrides: Partial<NightshiftSource> & Pick<NightshiftSource, 'id'>): NightshiftSource => ({
  title: overrides.id,
  description: '',
  tags: [],
  esql: 'FROM logs-*',
  slug: overrides.id,
  view_name: `$.nightshift.sources.default.${overrides.id}`,
  enabled: true,
  created_by: 'user',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  esql_updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeSourcesClient = (sources: NightshiftSource[]): SourcesClient =>
  ({
    list: jest.fn().mockResolvedValue({
      sources,
      total: sources.length,
      page: 1,
      per_page: 100,
    }),
  } as unknown as SourcesClient);

describe('reconcileSourceCatalog', () => {
  const cancel = jest.fn().mockResolvedValue(null);

  const makeKiClient = (reconcileIds: string[]) => ({
    setSourceRulesEnabled: jest.fn().mockResolvedValue(undefined),
    getStreamNamesToReconcile: jest.fn().mockResolvedValue(reconcileIds),
    deleteOwnedRules: jest.fn().mockResolvedValue(undefined),
    deleteAllQueries: jest.fn().mockResolvedValue(undefined),
    deleteIndicators: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    cancel.mockClear();
  });

  it('disables rules and cancels onboarding for a disabled source', async () => {
    const kiClient = makeKiClient(['disabled-source']);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'disabled-source', enabled: false })]),
      kiClient,
      onboardingClient: { cancel },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('disabled-source', false);
    expect(cancel).toHaveBeenCalledWith({ streamName: 'disabled-source', request });
    expect(kiClient.deleteOwnedRules).not.toHaveBeenCalled();
  });

  it('enables rules for an enabled source and leaves onboarding running', async () => {
    const kiClient = makeKiClient(['enabled-source']);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'enabled-source' })]),
      kiClient,
      onboardingClient: { cancel },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('enabled-source', true);
    expect(cancel).not.toHaveBeenCalled();
    expect(kiClient.deleteIndicators).not.toHaveBeenCalled();
  });

  it('does not re-enable rules while maintenance is paused', async () => {
    const kiClient = makeKiClient([]);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([
        makeSource({ id: 'enabled-source' }),
        makeSource({ id: 'disabled-source', enabled: false }),
      ]),
      kiClient,
      onboardingClient: { cancel },
      maintenanceService: { getState: jest.fn().mockResolvedValue('paused') },
      request,
    });

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledTimes(1);
    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('disabled-source', false);
    expect(cancel).toHaveBeenCalledWith({ streamName: 'disabled-source', request });
  });

  it('skips cancel when no onboarding client is available', async () => {
    const kiClient = makeKiClient([]);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'disabled-source', enabled: false })]),
      kiClient,
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('disabled-source', false);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('retires knowledge for an id that is no longer in the catalog', async () => {
    const kiClient = makeKiClient(['gone-source', 'enabled-source']);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'enabled-source' })]),
      kiClient,
      onboardingClient: { cancel },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(cancel).toHaveBeenCalledWith({ streamName: 'gone-source', request });
    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('gone-source');
    expect(kiClient.deleteAllQueries).toHaveBeenCalledWith('gone-source');
    expect(kiClient.deleteIndicators).toHaveBeenCalledWith('gone-source');
    expect(kiClient.deleteOwnedRules).not.toHaveBeenCalledWith('enabled-source');
  });
});
