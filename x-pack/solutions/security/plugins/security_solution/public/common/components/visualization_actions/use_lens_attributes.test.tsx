/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { getExternalAlertLensAttributes } from './lens_attributes/common/external_alert';
import { useLensAttributes } from './use_lens_attributes';
import {
  fieldNameExistsFilter,
  getDetailsPageFilter,
  getESQLGlobalFilters,
  getIndexFilters,
  getNetworkDetailsPageFilter,
  sourceOrDestinationIpExistsFilter,
} from './utils';

import { filterFromSearchBar, queryFromSearchBar, wrapper } from './mocks';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { SecurityPageName } from '../../../app/types';
import type { Query } from '@kbn/es-query';
import { getEventsHistogramLensAttributes } from './lens_attributes/common/events';
import type { EuiThemeComputed } from '@elastic/eui';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import {
  defaultImplementation,
  withIndices,
} from '../../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('generated-uuid'),
}));

jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn(),
}));

jest.mock('../../hooks/use_global_filter_query', () => ({
  useGlobalFilterQuery: () => () => ({
    filterQuery: undefined,
  }),
}));

const params = {
  euiTheme: {} as EuiThemeComputed,
};
describe('useLensAttributes', () => {
  beforeAll(() => {
    jest.mocked(useDataView).mockReturnValue(withIndices(['auditbeat-*']));
  });

  beforeEach(() => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: 'mockHost',
        pageName: 'hosts',
        tabName: 'events',
      },
    ]);
  });

  it('should add query', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.query).toEqual(queryFromSearchBar);
  });

  it('should add correct filters - host details', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes(params).state.filters,
      ...getDetailsPageFilter('hosts', 'mockHost'),
      ...fieldNameExistsFilter('hosts'),
      ...getIndexFilters(['auditbeat-*']),
      ...filterFromSearchBar,
    ]);
  });

  it('should add correct filters - network details', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: '192.168.1.1',
        pageName: 'network',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes(params).state.filters,
      ...getNetworkDetailsPageFilter('192.168.1.1'),
      ...sourceOrDestinationIpExistsFilter,
      ...getIndexFilters(['auditbeat-*']),
      ...filterFromSearchBar,
    ]);
  });

  it('should add correct filters - user details', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: 'elastic',
        pageName: 'user',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes(params).state.filters,
      ...getDetailsPageFilter('user', 'elastic'),
      ...getIndexFilters(['auditbeat-*']),
      ...filterFromSearchBar,
    ]);
  });

  it('should not apply global queries and filters - applyGlobalQueriesAndFilters = false', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: undefined,
        pageName: SecurityPageName.entityAnalytics,
        tabName: undefined,
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          applyGlobalQueriesAndFilters: false,
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect((result?.current?.state.query as Query).query).toEqual('');

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes(params).state.filters,
      ...getIndexFilters(['auditbeat-*']),
    ]);
  });

  it('should apply esql query and filter', () => {
    const esql = 'SELECT * FROM test-*';
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: undefined,
        pageName: SecurityPageName.entityAnalytics,
        tabName: undefined,
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
          applyGlobalQueriesAndFilters: true,
          esql,
        }),
      { wrapper }
    );

    expect(result?.current?.state.query as Query).toEqual({ esql });

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes(params).state.filters,
      ...getIndexFilters(['auditbeat-*']),
      ...getESQLGlobalFilters(undefined),
    ]);
  });

  it('should not apply tabs and pages when applyPageAndTabsFilters = false', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: 'elastic',
        pageName: 'user',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          applyPageAndTabsFilters: false,
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes(params).state.filters,
      ...getIndexFilters(['auditbeat-*']),
      ...filterFromSearchBar,
    ]);
  });

  it('should add data view id to references', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.references).toEqual([
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-layer-id-generated-uuid',
      },
      {
        type: 'index-pattern',
        name: '723c4653-681b-4105-956e-abef287bf025',
        id: 'security-solution-default',
      },
      {
        type: 'index-pattern',
        name: 'a04472fc-94a3-4b8d-ae05-9d30ea8fbd6a',
        id: 'security-solution-default',
      },
    ]);
  });

  it('should not set splitAccessors if stackByField is undefined', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: undefined,
        }),
      { wrapper }
    );

    expect(result?.current?.state?.visualization).toEqual(
      expect.objectContaining({
        layers: expect.arrayContaining([
          expect.objectContaining({ seriesType: 'bar_stacked', splitAccessors: undefined }),
        ]),
      })
    );
  });

  it('should return null if no indices exist', () => {
    jest.mocked(useDataView).mockImplementation(defaultImplementation);

    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toBeNull();
  });

  it('should return null if stackByField is an empty string', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: '',
        }),
      { wrapper }
    );

    expect(result?.current).toBeNull();
  });

  it('should return null if extraOptions.breakDownField is an empty string', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'kibana.alert.rule.name',
          extraOptions: {
            breakdownField: '',
          },
        }),
      { wrapper }
    );

    expect(result?.current).toBeNull();
  });

  it('should return Lens attributes if adHocDataViews exist', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: {
            ...kpiHostMetricLensAttributes,
            state: {
              ...kpiHostMetricLensAttributes.state,
              adHocDataViews: { mockAdHocDataViews: {} },
            },
          },
        }),
      { wrapper }
    );

    expect(result?.current).not.toBeNull();
  });
});
