/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import * as getAllMonitors from '../../saved_objects/synthetics_monitor/process_monitors';
import * as getCertsFacets from '../../queries/get_certs_facets';
import { getSyntheticsCertsFacetsRoute } from './get_certificates_facets';

const serverlessServer = { isElasticsearchServerless: true } as any;

describe('getSyntheticsCertsFacetsRoute', () => {
  afterEach(() => vi.clearAllMocks());

  it('forwards showFromAllSpaces to getAll and the facets query', async () => {
    // @ts-expect-error partial implementation for testing
    vi.spyOn(getAllMonitors, 'processMonitors').mockReturnValue({
      enabledMonitorQueryIds: ['other-id'],
    });
    const facets = {
      monitorTypes: [],
      tags: [],
      issuers: [],
      resourceTypes: [],
      certOrigin: [],
      expiringWithin: [],
    };
    const getSyntheticsCertsFacetsSpy = vi
      .spyOn(getCertsFacets, 'getSyntheticsCertsFacets')
      .mockResolvedValue(facets);
    const getAll = vi.fn().mockReturnValue([{ id: 'other-id' }]);
    const route = getSyntheticsCertsFacetsRoute();

    const result = await route.handler({
      // @ts-expect-error partial implementation for testing
      request: { query: { showFromAllSpaces: true } },
      // @ts-expect-error partial implementation for testing
      syntheticsEsClient: vi.fn(),
      // @ts-expect-error partial implementation for testing
      monitorConfigRepository: { getAll },
      server: serverlessServer,
      spaceId: 'default',
    });

    expect(getAll).toHaveBeenCalledWith(
      expect.objectContaining({
        showFromAllSpaces: true,
      })
    );
    expect(getSyntheticsCertsFacetsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        showFromAllSpaces: true,
        spaceId: 'default',
      })
    );
    expect(result).toEqual({ data: facets });
  });
});
