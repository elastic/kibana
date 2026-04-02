/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import {
  buildKpiTotalUsersMetricLensAttributes,
  kpiTotalUsersMetricLensAttributes,
} from './kpi_total_users_metric';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('../../../../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    selectedPatterns: ['auditbeat-mytest-*'],
    dataViewId: 'security-solution-my-test',
    indicesExist: true,
    sourcererDataView: {},
  }),
}));

jest.mock('../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: 'elastic',
      pageName: 'users',
      tabName: 'events',
    },
  ]),
}));

describe('kpiTotalUsersMetricLensAttributes', () => {
  beforeAll(() => {
    jest
      .mocked(useDataView)
      .mockReturnValue(withIndices(['auditbeat-mytest-*'], 'security-solution-my-test'));
  });

  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: kpiTotalUsersMetricLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('uses Entity Store v2 latest index when entityStoreV2Enabled', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: buildKpiTotalUsersMetricLensAttributes({
            entityStoreV2Enabled: true,
            spaceId: 'custom_space',
          }),
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    const attrs = result.current;
    expect(attrs?.references).toEqual([]);
    expect(attrs?.state.internalReferences).toHaveLength(2);
    const spec = Object.values(attrs?.state.adHocDataViews ?? {})[0];
    expect(spec?.title).toBe('.entities.v2.latest.security_custom_space');
    const userTypeFilter = attrs?.state.filters?.find(
      (f) => f.meta?.key === 'entity.EngineMetadata.Type'
    );
    expect(userTypeFilter).toBeDefined();

    const formBased = attrs?.state.datasourceStates?.formBased;
    const layer = formBased?.layers && Object.values(formBased.layers)[0];
    const col = layer?.columns && Object.values(layer.columns)[0];
    expect(col && 'sourceField' in col ? col.sourceField : undefined).toBe('entity.id');
  });
});
