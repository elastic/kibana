/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import { useMonitorDetail } from './use_monitor_detail';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../common/constants';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useEsSearch: jest.fn().mockReturnValue({ data: undefined, loading: false }),
}));

const useEsSearchMock = observabilitySharedPublic.useEsSearch as jest.Mock;

describe('useMonitorDetail', () => {
  afterEach(() => jest.clearAllMocks());

  it('uses default index pattern when no remoteName is provided', () => {
    renderHook(() => useMonitorDetail('config-123', 'US East'));

    expect(useEsSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: SYNTHETICS_INDEX_PATTERN,
      }),
      ['config-123', 'US East', undefined],
      expect.any(Object)
    );
  });

  it('uses CCS index pattern when remoteName is provided', () => {
    renderHook(() => useMonitorDetail('config-123', 'US East', 'remote-cluster-1'));

    expect(useEsSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: `remote-cluster-1:${SYNTHETICS_INDEX_PATTERN}`,
      }),
      ['config-123', 'US East', 'remote-cluster-1'],
      expect.any(Object)
    );
  });

  it('includes configId and location in the query filters', () => {
    renderHook(() => useMonitorDetail('config-456', 'EU West'));

    const params = useEsSearchMock.mock.calls[0][0];
    const filters = params.query.bool.filter;

    expect(filters).toEqual(
      expect.arrayContaining([
        { term: { config_id: 'config-456' } },
        { term: { 'observer.geo.name': 'EU West' } },
        { exists: { field: 'summary' } },
      ])
    );
  });
});
