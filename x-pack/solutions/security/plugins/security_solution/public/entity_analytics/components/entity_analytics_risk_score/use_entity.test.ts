/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEntityInfo } from './use_entity';
import { EntityType } from '../../../../common/entity_analytics/types';

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
  };
});

describe('useEntityInfo', () => {
  it('should return host entity info', () => {
    const { result } = renderHook(() => useEntityInfo(EntityType.host));
    expect(result?.current).toMatchInlineSnapshot(`
      Object {
        "kpiQueryId": "hostHeaderRiskScoreKpiQuery",
        "linkProps": Object {
          "deepLinkId": "hosts",
          "onClick": [Function],
          "path": "/hostRisk",
        },
        "tableQueryId": "hostRiskDashboardTable",
      }
    `);
  });
  it('should return user entity info', () => {
    const { result } = renderHook(() => useEntityInfo(EntityType.user));
    expect(result?.current).toMatchInlineSnapshot(`
      Object {
        "kpiQueryId": "userHeaderRiskScoreKpiQuery",
        "linkProps": Object {
          "deepLinkId": "users",
          "onClick": [Function],
          "path": "/userRisk",
        },
        "tableQueryId": "userRiskDashboardTable",
      }
    `);
  });

  it('should return service entity info', () => {
    const { result } = renderHook(() => useEntityInfo(EntityType.service));
    expect(result?.current).toMatchInlineSnapshot(`
      Object {
        "kpiQueryId": "serviceHeaderRiskScoreKpiQuery",
        "linkProps": undefined,
        "tableQueryId": "serviceRiskDashboardTable",
      }
    `);
  });
});
