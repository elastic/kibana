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

  test('passes eventIndexPatterns to MatrixHistogram as overridePatterns', () => {
    const eventIndexPatterns = ['logs-*', 'auditbeat-*'];

    render(
      <TestProviders>
        <EventsByDataset {...baseProps} eventIndexPatterns={eventIndexPatterns} />
      </TestProviders>
    );

    expect(MatrixHistogramMocked).toHaveBeenCalledWith(
      expect.objectContaining({ overridePatterns: eventIndexPatterns }),
      expect.anything()
    );
  });

  test('does not include alert indices in overridePatterns when eventIndexPatterns is provided', () => {
    // Simulate what overview.tsx does: pass only non-alert patterns
    const eventIndexPatterns = ['logs-*', 'auditbeat-*'];
    const allPatterns = [...eventIndexPatterns, '.alerts-security.alerts-default'];

    // We do NOT pass allPatterns — that's the point. overview.tsx filters before passing.
    render(
      <TestProviders>
        <EventsByDataset {...baseProps} eventIndexPatterns={eventIndexPatterns} />
      </TestProviders>
    );

    const receivedPatterns = MatrixHistogramMocked.mock.calls[0][0].overridePatterns ?? [];

    expect(receivedPatterns).not.toContain('.alerts-security.alerts-default');
    expect(receivedPatterns).toEqual(eventIndexPatterns);
    // Verify the filtered patterns don't accidentally include the full set
    expect(receivedPatterns).not.toEqual(allPatterns);
  });

  test('remote cluster–prefixed event patterns are preserved in overridePatterns', () => {
    // CPS: remote event index patterns have a cluster-alias prefix; they must
    // not be stripped when building the events-only pattern list.
    const eventIndexPatterns = ['cluster-a:logs-*', 'cluster-a:auditbeat-*', 'logs-*'];

    render(
      <TestProviders>
        <EventsByDataset {...baseProps} eventIndexPatterns={eventIndexPatterns} />
      </TestProviders>
    );

    const receivedPatterns = MatrixHistogramMocked.mock.calls[0][0].overridePatterns ?? [];

    expect(receivedPatterns).toContain('cluster-a:logs-*');
    expect(receivedPatterns).toContain('cluster-a:auditbeat-*');
    expect(receivedPatterns).toContain('logs-*');
  });

  test('omits overridePatterns from MatrixHistogram when eventIndexPatterns is not provided', () => {
    render(
      <TestProviders>
        <EventsByDataset {...baseProps} />
      </TestProviders>
    );

    expect(MatrixHistogramMocked.mock.calls[0][0].overridePatterns).toBeUndefined();
  });
});
