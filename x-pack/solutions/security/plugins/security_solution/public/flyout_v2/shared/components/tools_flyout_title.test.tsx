/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ToolsFlyoutTitle } from './tools_flyout_title';
import { TOOLS_FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';

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

jest.mock('../../document/main', () => ({
  DocumentFlyout: () => <div data-test-subj="mockDocumentFlyout" />,
}));

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.rule.name': 'Test Rule Name',
});

const eventHit = createMockHit({
  'event.kind': 'event',
  'event.category': 'process',
  'process.name': 'test-process',
});

const renderToolsFlyoutTitle = (hit: DataTableRecord) => render(<ToolsFlyoutTitle hit={hit} />);

describe('<ToolsFlyoutTitle />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the alert title', () => {
    const { getByTestId } = renderToolsFlyoutTitle(alertHit);
    expect(getByTestId(TOOLS_FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent('Test Rule Name');
  });

  it('should render the event title', () => {
    const { getByTestId } = renderToolsFlyoutTitle(eventHit);
    expect(getByTestId(TOOLS_FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent('test-process');
  });

  it('should open the document flyout when clicked', () => {
    const { getByTestId } = renderToolsFlyoutTitle(alertHit);
    fireEvent.click(getByTestId(TOOLS_FLYOUT_HEADER_TITLE_TEST_ID));
    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
  });
});
