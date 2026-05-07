/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ToolsFlyoutHeader } from './tools_flyout_header';
import { TOOLS_FLYOUT_HEADER_TEST_ID } from './test_ids';

jest.mock('./tools_flyout_title', () => ({
  ToolsFlyoutTitle: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="mockToolsFlyoutTitle">{String(hit.id)}</div>
  ),
}));

jest.mock('../../document/components/severity', () => ({
  DocumentSeverity: () => <div data-test-subj="mockDocumentSeverity" />,
}));

jest.mock('./timestamp', () => ({
  Timestamp: ({ hit }: { hit: { id: string; flattened: Record<string, unknown> } }) => (
    <div data-test-subj="mockTimestamp" data-hit-id={hit.id} />
  ),
}));

const createMockHit = (
  flattened: DataTableRecord['flattened'] = { '@timestamp': '2024-01-15T10:30:00.000Z' }
): DataTableRecord =>
  ({
    id: 'hit-1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const renderHeader = (props: Partial<Parameters<typeof ToolsFlyoutHeader>[0]> = {}) => {
  const hit = createMockHit();
  return render(
    <IntlProvider locale="en">
      <ToolsFlyoutHeader hit={hit} title={<span>{'Correlations'}</span>} {...props} />
    </IntlProvider>
  );
};

describe('<ToolsFlyoutHeader />', () => {
  it('should render the header container', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId(TOOLS_FLYOUT_HEADER_TEST_ID)).toBeInTheDocument();
  });

  it('should render the tool title', () => {
    const { getByText } = renderHeader({ title: <span>{'Session view'}</span> });
    expect(getByText('Session view')).toBeInTheDocument();
  });

  it('should render ToolsFlyoutTitle', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId('mockToolsFlyoutTitle')).toBeInTheDocument();
  });

  it('should render the document severity', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId('mockDocumentSeverity')).toBeInTheDocument();
  });

  it('should render the document timestamp', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId('mockTimestamp')).toBeInTheDocument();
    expect(getByTestId('mockTimestamp')).toHaveAttribute('data-hit-id', 'hit-1');
  });
});
