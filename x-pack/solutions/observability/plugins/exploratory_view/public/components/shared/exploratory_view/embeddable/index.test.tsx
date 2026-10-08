/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { waitFor } from '@testing-library/react';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { render, mockCore } from '../rtl_helpers';
import * as useAppDataViewHook from './use_app_data_view';
import { getExploratoryViewEmbeddable } from '.';
import type { ExploratoryEmbeddableProps } from './embeddable';

// Capture props passed to Embeddable
let capturedEmbeddableProps: ExploratoryEmbeddableProps | null = null;

jest.mock('./embeddable', () => ({
  __esModule: true,
  default: jest.fn((props) => {
    capturedEmbeddableProps = props;
    return <div data-test-subj="mock-embeddable">mockEmbeddable</div>;
  }),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useFetcher: jest.fn(() => ({
    data: { formula: {} },
    loading: false,
  })),
}));

const mockTimeRange1 = {
  from: '2022-02-15T16:00:00.000Z',
  to: '2022-02-16T15:59:59.999Z',
};

const mockTimeRange2 = {
  from: '2022-02-17T16:00:00.000Z',
  to: '2022-02-18T15:59:59.999Z',
};

const mockLens = {
  EmbeddableComponent: jest.fn(() => <div>mockEmbeddableComponent</div>),
  SaveModalComponent: jest.fn(() => <div>mockSaveModalComponent</div>),
  stateHelperApi: jest.fn().mockResolvedValue({ formula: {} }),
} as unknown as LensPublicStart;

const createMockAttributes = (time: { from: string; to: string }) => [
  {
    name: 'test-series',
    dataType: 'synthetics' as const,
    time,
    reportDefinitions: {},
    selectedMetricField: 'monitor.duration.us',
  },
];

describe('getExploratoryViewEmbeddable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEmbeddableProps = null;

    // Mock useAppDataView to return valid dataViews
    jest.spyOn(useAppDataViewHook, 'useAppDataView').mockReturnValue({
      dataViews: { synthetics: {} },
      loading: false,
    } as any);
  });

  it('should NOT use cached time when time range changes', async () => {
    const core = mockCore();
    core.lens = mockLens;
    core.data!.search.session.getSessionId = jest.fn().mockReturnValue('test-session');

    const ExploratoryViewEmbeddable = getExploratoryViewEmbeddable(core as any);

    const initialProps: ExploratoryEmbeddableProps = {
      id: 'test-embeddable-id',
      attributes: createMockAttributes(mockTimeRange1),
      reportType: 'kpi-over-time',
    };

    // Initial render with first time range
    const { rerender } = render(<ExploratoryViewEmbeddable {...initialProps} />, { core });

    // Wait for Embeddable to be rendered
    await waitFor(() => {
      expect(capturedEmbeddableProps).not.toBeNull();
    });

    // Verify initial time range is passed to Embeddable
    expect(capturedEmbeddableProps?.attributes?.[0].time).toEqual(mockTimeRange1);

    // Rerender with different time range
    const updatedProps: ExploratoryEmbeddableProps = {
      ...initialProps,
      attributes: createMockAttributes(mockTimeRange2),
    };

    rerender(<ExploratoryViewEmbeddable {...updatedProps} />);

    // Wait for re-render to complete
    await waitFor(() => {
      expect(capturedEmbeddableProps?.attributes?.[0].time).toEqual(mockTimeRange2);
    });
  });

  it('should update cached time when time range changes', async () => {
    const core = mockCore();
    core.lens = mockLens;
    core.data!.search.session.getSessionId = jest.fn().mockReturnValue('test-session');

    const ExploratoryViewEmbeddable = getExploratoryViewEmbeddable(core as any);

    const mockTimeRange3 = {
      from: '2022-02-19T16:00:00.000Z',
      to: '2022-02-20T15:59:59.999Z',
    };

    const baseProps: ExploratoryEmbeddableProps = {
      id: 'test-cache-update-id',
      attributes: createMockAttributes(mockTimeRange1),
      reportType: 'kpi-over-time',
    };

    const { rerender } = render(<ExploratoryViewEmbeddable {...baseProps} />, { core });

    await waitFor(() => {
      expect(capturedEmbeddableProps).not.toBeNull();
    });
    expect(capturedEmbeddableProps?.attributes?.[0].time).toEqual(mockTimeRange1);

    // Change to mockTimeRange2
    rerender(
      <ExploratoryViewEmbeddable {...baseProps} attributes={createMockAttributes(mockTimeRange2)} />
    );
    await waitFor(() => {
      expect(capturedEmbeddableProps?.attributes?.[0].time).toEqual(mockTimeRange2);
    });

    // Change to mockTimeRange3
    rerender(
      <ExploratoryViewEmbeddable {...baseProps} attributes={createMockAttributes(mockTimeRange3)} />
    );
    await waitFor(() => {
      expect(capturedEmbeddableProps?.attributes?.[0].time).toEqual(mockTimeRange3);
    });
  });
});
