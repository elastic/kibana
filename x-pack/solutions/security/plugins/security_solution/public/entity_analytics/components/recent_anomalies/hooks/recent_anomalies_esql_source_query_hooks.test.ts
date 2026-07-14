/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import {
  useRecentAnomaliesTopRowsEsqlSource,
  useRecentAnomaliesDataEsqlSource,
} from './recent_anomalies_esql_source_query_hooks';

jest.mock('@kbn/entity-store/public', () => ({ useEntityStoreEuidApi: jest.fn() }));
jest.mock('@kbn/entity-store/common', () => ({
  getLatestEntitiesIndexName: jest.fn(() => '.entities.v2.latest.security_default'),
}));
jest.mock('../anomaly_heatmap_interval', () => ({ useIntervalForHeatmap: jest.fn(() => 3) }));

const mockUseEntityStoreEuidApi = useEntityStoreEuidApi as jest.Mock;

const TIME_RANGE_WHERE = '| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';

describe('recent anomalies ES|QL sources', () => {
  beforeEach(() => {
    mockUseEntityStoreEuidApi.mockReturnValue({
      euid: {
        esql: {
          getFieldEvaluations: (entityType: string) =>
            `${entityType}_field = TO_STRING(${entityType}.name)`,
          getIdentityFieldEvaluations: (entityType: string) =>
            `${entityType}_namespace = "test_ns"`,
          getEuidEvaluation: (entityType: string, target: string) =>
            `${target} = CONCAT("${entityType}:", ${entityType}.name)`,
        },
      },
    });
  });

  it('emits identity field evals in a separate | EVAL stage before the EUID formula', () => {
    const { result } = renderHook(() =>
      useRecentAnomaliesTopRowsEsqlSource({
        anomalyBands: [],
        viewBy: 'entity',
        spaceId: 'default',
        rowsLimit: 5,
      })
    );
    const source = result.current!;

    // All three | EVAL stages must be present
    const topLevelPos = source.indexOf('| EVAL user_field =');
    const identityPos = source.indexOf('| EVAL user_namespace =');
    const euidPos = source.indexOf('| EVAL user_euid =');

    expect(topLevelPos).toBeGreaterThan(-1);
    expect(identityPos).toBeGreaterThan(-1);
    expect(euidPos).toBeGreaterThan(-1);

    // Identity field evals must come after top-level field evals and before the EUID formula
    expect(topLevelPos).toBeLessThan(identityPos);
    expect(identityPos).toBeLessThan(euidPos);
  });

  const expectTimeRangeBeforeLookupJoin = (source: string | undefined) => {
    expect(source).toBeDefined();
    expect(source).toContain(TIME_RANGE_WHERE);
    expect(source!.indexOf(TIME_RANGE_WHERE)).toBeLessThan(source!.indexOf('LOOKUP JOIN'));
  };

  it.each(['entity', 'jobId'] as const)(
    'top rows source (%s mode) filters the time range inside the query text',
    (viewBy) => {
      const { result } = renderHook(() =>
        useRecentAnomaliesTopRowsEsqlSource({
          anomalyBands: [],
          viewBy,
          spaceId: 'default',
          rowsLimit: 5,
        })
      );
      expectTimeRangeBeforeLookupJoin(result.current);
    }
  );

  it.each(['entity', 'jobId'] as const)(
    'anomaly data source (%s mode) filters the time range inside the query text',
    (viewBy) => {
      const { result } = renderHook(() =>
        useRecentAnomaliesDataEsqlSource({
          anomalyBands: [],
          viewBy,
          spaceId: 'default',
          rowLabels: ['row-1'],
        })
      );
      expectTimeRangeBeforeLookupJoin(result.current);
    }
  );
});
