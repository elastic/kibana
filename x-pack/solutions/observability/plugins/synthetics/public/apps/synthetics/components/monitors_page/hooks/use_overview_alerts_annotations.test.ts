/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../../common/constants/synthetics_alerts';
import { useOverviewAlertsAnnotations } from './use_overview_alerts_annotations';
import * as paramHook from '../../../hooks/use_url_params';
import * as filtersHook from './use_monitor_filters';
import * as spaceHook from '../../../../../hooks/use_kibana_space';

const mockAlertsDataView = { id: 'alerts-data-view', title: '.alerts-observability*' };

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { dataViews: {} } }),
}));

const mockUseFetcher = jest.fn();
jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useFetcher: () => mockUseFetcher(),
}));

jest.mock('@kbn/exploratory-view-plugin/public', () => ({
  ObservabilityDataViews: jest.fn(),
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({ euiTheme: { colors: { accent: '#F04E98' } } }),
}));

describe('useOverviewAlertsAnnotations', () => {
  const paramSpy = jest.spyOn(paramHook, 'useGetUrlParams');
  const filtersSpy = jest.spyOn(filtersHook, 'useMonitorFilters');
  const spaceSpy = jest.spyOn(spaceHook, 'useKibanaSpace');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetcher.mockReturnValue({ data: mockAlertsDataView });
    filtersSpy.mockReturnValue([]);
    paramSpy.mockReturnValue({} as any);
    spaceSpy.mockReturnValue({ loading: false } as any);
  });

  const getQuery = (result: { current: ReturnType<typeof useOverviewAlertsAnnotations> }) => {
    const layer = result.current?.[0];
    return (layer?.annotations[0] as { filter: { query: string } }).filter.query;
  };

  it('returns undefined until the alerts data view resolves', () => {
    mockUseFetcher.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useOverviewAlertsAnnotations());

    expect(result.current).toBeUndefined();
  });

  it('returns undefined while the active space is still resolving, even if the data view is ready', () => {
    // Spaces are a security boundary for alert data — `alertsFilters` omits
    // `kibana.space_ids` until the space resolves, so building the layer
    // before that would transiently expose alert tooltip data from every
    // space.
    spaceSpy.mockReturnValue({ loading: true } as any);

    const { result } = renderHook(() => useOverviewAlertsAnnotations());

    expect(result.current).toBeUndefined();
  });

  it('scopes to the synthetics rule types and an active/recovered status by default', () => {
    const { result } = renderHook(() => useOverviewAlertsAnnotations());

    expect(getQuery(result)).toEqual(
      `kibana.alert.rule.rule_type_id: ("${SYNTHETICS_STATUS_RULE}" or "${SYNTHETICS_TLS_RULE}") and kibana.alert.status: ("active" or "recovered")`
    );
  });

  it('adds a locations clause when locations are selected', () => {
    paramSpy.mockReturnValue({ locations: ['us-east'] } as any);

    const { result } = renderHook(() => useOverviewAlertsAnnotations());

    expect(getQuery(result)).toContain('observer.geo.name: "us-east"');
  });

  it('folds the shared monitor filters (e.g. space scoping) into the query', () => {
    filtersSpy.mockReturnValue([{ field: 'kibana.space_ids', values: ['default'] }]);

    const { result } = renderHook(() => useOverviewAlertsAnnotations());

    expect(getQuery(result)).toContain('kibana.space_ids: "default"');
  });

  it('adds a monitor.name wildcard clause for the free-text search box', () => {
    paramSpy.mockReturnValue({ query: 'checkout' } as any);

    const { result } = renderHook(() => useOverviewAlertsAnnotations());

    expect(getQuery(result)).toContain('monitor.name: *checkout*');
  });

  it('escapes double quotes and backslashes in a quoted filter value', () => {
    // A trailing backslash right before the quote this test adds is the
    // regression case: escaping the quote alone (without escaping the
    // backslash first) would let it combine with that quote and re-open the
    // literal early.
    filtersSpy.mockReturnValue([{ field: 'tags', values: ['a" or monitor.name: "b\\'] }]);

    const { result } = renderHook(() => useOverviewAlertsAnnotations());

    expect(getQuery(result)).toContain('tags: "a\\" or monitor.name: \\"b\\\\"');
  });

  it('escapes KQL operators and grouping characters in the free-text search clause', () => {
    paramSpy.mockReturnValue({ query: 'a) or monitor.name: (b' } as any);

    const { result } = renderHook(() => useOverviewAlertsAnnotations());

    expect(getQuery(result)).toContain('monitor.name: *a\\) \\or monitor.name\\: \\(b*');
  });
});
