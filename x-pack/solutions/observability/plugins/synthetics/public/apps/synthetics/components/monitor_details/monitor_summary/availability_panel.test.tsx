/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AvailabilityPanel } from './availability_panel';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

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

const mockUseSyntheticsDataViewIndexPatterns = jest.fn();
jest.mock('../hooks/use_synthetics_data_view_index_patterns', () => ({
  useSyntheticsDataViewIndexPatterns: () => mockUseSyntheticsDataViewIndexPatterns(),
}));

// AvailabilityPanel is the simplest of the 11 Overview-tab consumers of
// ExploratoryViewEmbeddable. The CCS plumbing in PR5 is identical across all
// of them (call useSyntheticsDataViewIndexPatterns, forward to
// dataTypesIndexPatterns prop), so we cover the pattern here once.
describe('AvailabilityPanel CCS plumbing', () => {
  const time = { from: 'now-30d/d', to: 'now', id: 'availabilityPanel' };

  beforeEach(() => {
    mockEmbeddable.mockClear();
    mockUseMonitorQueryFilters.mockReturnValue({
      queryIdFilter: { 'monitor.id': ['m1'] },
      locationFilter: [{ field: 'observer.geo.name', values: ['us-east'] }],
    });
  });

  it('renders nothing while the monitor query filter is unresolved', () => {
    mockUseMonitorQueryFilters.mockReturnValue({});
    mockUseSyntheticsDataViewIndexPatterns.mockReturnValue({
      synthetics: SYNTHETICS_INDEX_PATTERN,
    });

    const { container } = render(<AvailabilityPanel {...time} />);

    expect(container).toBeEmptyDOMElement();
    expect(mockEmbeddable).not.toHaveBeenCalled();
  });

  it('forwards the local index pattern via dataTypesIndexPatterns', () => {
    mockUseSyntheticsDataViewIndexPatterns.mockReturnValue({
      synthetics: SYNTHETICS_INDEX_PATTERN,
    });

    render(<AvailabilityPanel {...time} />);

    expect(mockEmbeddable).toHaveBeenCalledTimes(1);
    const props = mockEmbeddable.mock.calls[0][0];
    expect(props.dataTypesIndexPatterns).toEqual({ synthetics: SYNTHETICS_INDEX_PATTERN });
  });

  it('forwards a CCS-prefixed index pattern when the hook resolves a remote monitor', () => {
    mockUseSyntheticsDataViewIndexPatterns.mockReturnValue({
      synthetics: `remote-a:${SYNTHETICS_INDEX_PATTERN}`,
    });

    render(<AvailabilityPanel {...time} />);

    expect(mockEmbeddable).toHaveBeenCalledTimes(1);
    const props = mockEmbeddable.mock.calls[0][0];
    expect(props.dataTypesIndexPatterns).toEqual({
      synthetics: `remote-a:${SYNTHETICS_INDEX_PATTERN}`,
    });
  });
});
