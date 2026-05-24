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
  expandIndexPatternsForCps,
  fieldNameExistsFilter,
  getDetailsPageFilter,
  getIndexFilters,
  sourceOrDestinationIpExistsFilter,
  getNetworkDetailsPageFilter,
  getESQLGlobalFilters,
} from './utils';

import { filterFromSearchBar, queryFromSearchBar, wrapper } from './mocks';
import { useSourcererDataView } from '../../../sourcerer/containers';
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

jest.mock('../../../sourcerer/containers');
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
    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: true,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
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
      ...getIndexFilters(expandIndexPatternsForCps(['auditbeat-*'])),
      ...filterFromSearchBar,
    ]);
  });

  it('skips host.name exists tab filter when entityStoreV2Enabled extraOption is set', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: { entityStoreV2Enabled: true },
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes(params).state.filters,
      ...getDetailsPageFilter('hosts', 'mockHost'),
      ...getIndexFilters(expandIndexPatternsForCps(['auditbeat-*'])),
      ...filterFromSearchBar,
    ]);
  });

  it('skips user.name exists tab filter when entityStoreV2Enabled on users page', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: 'elastic',
        pageName: SecurityPageName.users,
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: { entityStoreV2Enabled: true },
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes(params).state.filters,
      ...getDetailsPageFilter(SecurityPageName.users, 'elastic'),
      ...getIndexFilters(expandIndexPatternsForCps(['auditbeat-*'])),
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
      ...getIndexFilters(expandIndexPatternsForCps(['auditbeat-*'])),
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
      ...getIndexFilters(expandIndexPatternsForCps(['auditbeat-*'])),
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
      ...getIndexFilters(expandIndexPatternsForCps(['auditbeat-*'])),
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
      ...getIndexFilters(expandIndexPatternsForCps(['auditbeat-*'])),
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
      ...getIndexFilters(expandIndexPatternsForCps(['auditbeat-*'])),
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

    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: false,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
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
    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: false,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
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
    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: false,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
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

  it('layers a CPS-expanded negated drop-list on top of the CPS-expanded allowlist when excludedPatterns is set', () => {
    // The "should return null if no indices exist" test (above this one in execution order)
    // changes useDataView to the default (no matched indices), so restore it here.
    // The scope includes both event and alert-backing index patterns.
    jest
      .mocked(useDataView)
      .mockReturnValue(withIndices(['auditbeat-*', '.alerts-security.alerts-default']));

    const excludedPatterns = ['.alerts-security.alerts-default'];

    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
          excludedPatterns,
        }),
      { wrapper }
    );

    // The _index filter is a CPS-expanded allowlist for selectedPatterns plus a
    // CPS-expanded negated drop-list for excludedPatterns. The allowlist bounds
    // the chart to the user's scope (locally and across remote clusters), and
    // the drop-list defensively removes alert-backing indices on top.
    const allowlist = getIndexFilters(
      expandIndexPatternsForCps(['auditbeat-*', '.alerts-security.alerts-default'])
    );
    const dropList = getIndexFilters(expandIndexPatternsForCps(excludedPatterns)).map((f) => ({
      ...f,
      meta: { ...f.meta, negate: true },
    }));

    // Default beforeEach route: hosts/events/mockHost, so pageFilters + tabsFilters apply.
    expect(result?.current?.state.filters).toEqual([
      ...getEventsHistogramLensAttributes(params).state.filters,
      ...getDetailsPageFilter('hosts', 'mockHost'),
      ...fieldNameExistsFilter('hosts'),
      ...allowlist,
      ...dropList,
      ...filterFromSearchBar,
    ]);
  });

  it('signalIndexName scope is maintained even when excludedPatterns is also provided', () => {
    jest.mocked(useDataView).mockReturnValue(withIndices(['auditbeat-*']));

    // When signalIndexName is present the negated-exclusion path is bypassed so that
    // the Alerts trend chart always scopes to the local signal index only.
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
          signalIndexName: '.alerts-security.alerts-default',
          excludedPatterns: ['logs-*'],
        }),
      { wrapper }
    );

    // _index filter is the allowlist for [signalIndexName], not affected by excludedPatterns.
    expect(result?.current?.state.filters).toEqual([
      ...getEventsHistogramLensAttributes(params).state.filters,
      ...getDetailsPageFilter('hosts', 'mockHost'),
      ...fieldNameExistsFilter('hosts'),
      ...getIndexFilters(['.alerts-security.alerts-default']),
      ...filterFromSearchBar,
    ]);
  });

  it('should return Lens attributes if adHocDataViews exist', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: false,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
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
