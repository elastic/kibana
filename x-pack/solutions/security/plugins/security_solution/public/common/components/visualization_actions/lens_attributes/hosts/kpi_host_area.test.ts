/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { getKpiHostAreaLensAttributes } from './kpi_host_area';
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
      detailName: 'mockHost',
      pageName: 'hosts',
      tabName: 'events',
    },
  ]),
}));

describe('getKpiHostAreaLensAttributes', () => {
  beforeAll(() => {
    jest
      .mocked(useDataView)
      .mockReturnValue(withIndices(['auditbeat-mytest-*'], 'security-solution-my-test'));
  });

  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getKpiHostAreaLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('uses Entity Store v2 latest index as ad-hoc data source when entityStoreV2Enabled', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: { entityStoreV2Enabled: true, spaceId: 'my_space' },
          getLensAttributes: getKpiHostAreaLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    const attrs = result.current;
    expect(attrs?.references).toEqual([]);
    expect(attrs?.state.internalReferences).toHaveLength(2);
    const adHoc = attrs?.state.adHocDataViews;
    expect(adHoc).toBeDefined();
    const spec = Object.values(adHoc ?? {})[0];
    expect(spec?.title).toBe('.entities.v2.latest.security_my_space');
    const hostTypeFilter = attrs?.state.filters?.find(
      (f) => f.meta?.key === 'entity.EngineMetadata.Type'
    );
    expect(hostTypeFilter).toBeDefined();
    expect(hostTypeFilter?.meta?.index).toBe('7f2a9c1e-4b8d-4e6f-a3c2-9d1e8f7a6b5c');

    const formBased = attrs?.state.datasourceStates?.formBased;
    const layer = formBased?.layers && Object.values(formBased.layers)[0];
    const metricColumn =
      layer?.columns && Object.values(layer.columns).find((c) => c.isBucketed === false);
    expect(
      metricColumn && 'sourceField' in metricColumn ? metricColumn.sourceField : undefined
    ).toBe('entity.id');
  });
});
