/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ToolsFlyoutHeader } from './tools_flyout_header';
import { TOOLS_FLYOUT_HEADER_TEST_ID, TOOLS_FLYOUT_HEADER_EXPAND_BUTTON_TEST_ID } from './test_ids';

const mockOpenSystemFlyout = jest.fn();

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      overlays: {
        openSystemFlyout: mockOpenSystemFlyout,
      },
    },
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useStore: () => ({}),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
}));

jest.mock('../hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: () => ({ size: 'm' }),
}));

jest.mock('./flyout_provider', () => ({
  flyoutProviders: jest.fn(({ children }: { children: React.ReactNode }) => children),
}));

jest.mock('../../document', () => ({
  DocumentFlyout: () => <div data-test-subj="mockDocumentFlyout" />,
}));

jest.mock('../../document/components/title', () => ({
  Title: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="mockTitle">{String(hit.id)}</div>
  ),
}));

jest.mock('../../document/components/severity', () => ({
  DocumentSeverity: () => <div data-test-subj="mockDocumentSeverity" />,
}));

jest.mock('../../document/components/timestamp', () => ({
  Timestamp: () => <div data-test-subj="mockTimestamp" />,
}));

const createMockHit = (flattened: DataTableRecord['flattened'] = {}): DataTableRecord =>
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the header container', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId(TOOLS_FLYOUT_HEADER_TEST_ID)).toBeInTheDocument();
  });

  it('should render the tool title', () => {
    const { getByText } = renderHeader({ title: <span>{'Session view'}</span> });
    expect(getByText('Session view')).toBeInTheDocument();
  });

  it('should render the expand button', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId(TOOLS_FLYOUT_HEADER_EXPAND_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should call openSystemFlyout when the expand button is clicked', () => {
    const { getByTestId } = renderHeader();
    fireEvent.click(getByTestId(TOOLS_FLYOUT_HEADER_EXPAND_BUTTON_TEST_ID));
    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
  });

  it('should render the document title', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId('mockTitle')).toBeInTheDocument();
  });

  it('should render the document severity', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId('mockDocumentSeverity')).toBeInTheDocument();
  });

  it('should render the document timestamp', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId('mockTimestamp')).toBeInTheDocument();
  });
});
