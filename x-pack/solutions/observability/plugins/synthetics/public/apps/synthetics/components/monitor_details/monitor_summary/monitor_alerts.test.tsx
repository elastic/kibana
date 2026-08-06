/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MonitorAlerts } from './monitor_alerts';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

const ALERTS_INDEX_PATTERN = '.alerts-observability*';

const mockEmbeddable = jest.fn((_props: Record<string, unknown>) => null);
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      exploratoryView: { ExploratoryViewEmbeddable: mockEmbeddable },
    },
  }),
}));

const mockUseMonitorQueryFilters = jest.fn();
jest.mock('../hooks/use_monitor_query_filters', () => ({
  useMonitorQueryFilters: () => mockUseMonitorQueryFilters(),
}));

const mockUseSelectedLocation = jest.fn();
jest.mock('../hooks/use_selected_location', () => ({
  useSelectedLocation: () => mockUseSelectedLocation(),
}));

const mockUseSyntheticsDataViewIndexPatterns = jest.fn();
jest.mock('../hooks/use_synthetics_data_view_index_patterns', () => ({
  useSyntheticsDataViewIndexPatterns: () => mockUseSyntheticsDataViewIndexPatterns(),
}));

// AlertActions performs Redux + URL plumbing we don't need to exercise here;
// stub it out to keep the render focused on embeddable wiring.
jest.mock('./alert_actions', () => ({
  AlertActions: () => null,
}));

describe('MonitorAlerts CCS plumbing', () => {
  const baseProps = { from: 'now-30d/d', to: 'now', dateLabel: 'Last 30 days' };

  beforeEach(() => {
    mockEmbeddable.mockClear();
    mockUseMonitorQueryFilters.mockReturnValue({
      queryIdFilter: { 'monitor.id': ['m1'] },
      locationFilter: [{ field: 'observer.geo.name', values: ['us-east'] }],
    });
    mockUseSelectedLocation.mockReturnValue({ id: 'us-east', label: 'US East' });
  });

  it('renders a loading skeleton when the selected location or filter is unresolved', () => {
    mockUseSelectedLocation.mockReturnValue(undefined);
    mockUseSyntheticsDataViewIndexPatterns.mockReturnValue({
      synthetics: SYNTHETICS_INDEX_PATTERN,
      alerts: ALERTS_INDEX_PATTERN,
    });

    render(<MonitorAlerts {...baseProps} />);

    expect(mockEmbeddable).not.toHaveBeenCalled();
  });

  it('forwards local alerts index pattern to every embeddable instance', () => {
    mockUseSyntheticsDataViewIndexPatterns.mockReturnValue({
      synthetics: SYNTHETICS_INDEX_PATTERN,
      alerts: ALERTS_INDEX_PATTERN,
    });

    render(<MonitorAlerts {...baseProps} />);

    // 5 embeddable usages: inline header count + active count/sparkline +
    // recovered count/sparkline.
    expect(mockEmbeddable).toHaveBeenCalledTimes(5);
    mockEmbeddable.mock.calls.forEach(([props]) => {
      expect(props.dataTypesIndexPatterns).toEqual({
        synthetics: SYNTHETICS_INDEX_PATTERN,
        alerts: ALERTS_INDEX_PATTERN,
      });
    });
  });

  it('forwards CCS-prefixed alerts index pattern when the monitor is remote', () => {
    mockUseSyntheticsDataViewIndexPatterns.mockReturnValue({
      synthetics: `remote-a:${SYNTHETICS_INDEX_PATTERN}`,
      alerts: `remote-a:${ALERTS_INDEX_PATTERN}`,
    });

    render(<MonitorAlerts {...baseProps} />);

    expect(mockEmbeddable).toHaveBeenCalledTimes(5);
    mockEmbeddable.mock.calls.forEach(([props]) => {
      expect(props.dataTypesIndexPatterns).toEqual({
        synthetics: `remote-a:${SYNTHETICS_INDEX_PATTERN}`,
        alerts: `remote-a:${ALERTS_INDEX_PATTERN}`,
      });
    });
  });
});
