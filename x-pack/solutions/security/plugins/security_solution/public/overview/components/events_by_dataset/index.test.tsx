/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { EventsByDataset } from '.';
import { MatrixHistogram } from '../../../common/components/matrix_histogram';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('../../../common/components/link_to');
jest.mock('../../../common/components/matrix_histogram', () => ({
  MatrixHistogram: jest.fn().mockReturnValue(null),
}));

const MatrixHistogramMocked = MatrixHistogram as jest.MockedFunction<typeof MatrixHistogram>;

describe('EventsByDataset', () => {
  const from = '2020-01-20T20:49:57.080Z';
  const to = '2020-01-21T20:49:57.080Z';

  const baseProps = {
    deleteQuery: jest.fn(),
    filters: [],
    from,
    to,
    dataView: createStubDataView({ spec: {} }),
    query: { query: '', language: 'kuery' as const },
    queryType: 'overview' as const,
  };

  beforeEach(() => {
    MatrixHistogramMocked.mockClear();
  });

  test('passes excludedPatterns through to MatrixHistogram', () => {
    const excludedPatterns = ['.alerts-security.alerts-default'];

    render(
      <TestProviders>
        <EventsByDataset {...baseProps} excludedPatterns={excludedPatterns} />
      </TestProviders>
    );

    expect(MatrixHistogramMocked).toHaveBeenCalledWith(
      expect.objectContaining({ excludedPatterns }),
      expect.anything()
    );
  });

  test('remote cluster–prefixed event patterns are NOT included in excludedPatterns', () => {
    // CPS: caller (overview.tsx) computes the drop-list via getAlertsIndexPatterns,
    // so only alert-backing indices end up in excludedPatterns. Remote cluster–
    // prefixed event patterns must not be present, otherwise the chart's negated
    // _index filter would drop those documents.
    const excludedPatterns = ['.alerts-security.alerts-default'];

    render(
      <TestProviders>
        <EventsByDataset {...baseProps} excludedPatterns={excludedPatterns} />
      </TestProviders>
    );

    const received = MatrixHistogramMocked.mock.calls[0][0].excludedPatterns ?? [];

    expect(received.some((p) => p.startsWith('cluster-a:'))).toBe(false);
    expect(received).toEqual(excludedPatterns);
  });

  test('passes an empty excludedPatterns through to MatrixHistogram', () => {
    // Empty excludedPatterns is a no-op downstream (equivalent to undefined in
    // buildIndexFilters), but the prop should still flow through unchanged.
    render(
      <TestProviders>
        <EventsByDataset {...baseProps} excludedPatterns={[]} />
      </TestProviders>
    );

    expect(MatrixHistogramMocked.mock.calls[0][0].excludedPatterns).toEqual([]);
  });

  test('omits excludedPatterns from MatrixHistogram when prop is not provided', () => {
    render(
      <TestProviders>
        <EventsByDataset {...baseProps} />
      </TestProviders>
    );

    expect(MatrixHistogramMocked.mock.calls[0][0].excludedPatterns).toBeUndefined();
  });
});
