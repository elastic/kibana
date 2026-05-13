/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { renderWithI18n as render } from '@kbn/test-jest-helpers';

import { PanelHeader } from './header';
import { allThreeTabs } from './hooks/use_tabs';
import { useBasicDataFromDetailsData } from '../shared/hooks/use_basic_data_from_details_data';
import { useDocumentDetailsContext } from '../shared/context';

const REMOTE_CALLOUT_TEXT =
  'This event originates from a remote cluster. Some features may not be available.';

jest.mock('../shared/context', () => ({
  useDocumentDetailsContext: jest.fn().mockImplementation(() => {
    const { mockSearchHit } = jest.requireActual('../shared/mocks/mock_search_hit');

    return {
      dataFormattedForFieldBrowser: [],
      searchHit: mockSearchHit,
    };
  }),
}));
jest.mock('../shared/hooks/use_basic_data_from_details_data', () => ({
  useBasicDataFromDetailsData: jest.fn(),
}));

jest.mock('./components/alert_header_title', () => ({
  AlertHeaderTitle: jest.fn(() => <div data-test-subj="alert-header" />),
}));

jest.mock('./components/event_header_title', () => ({
  EventHeaderTitle: jest.fn(() => <div data-test-subj="event-header" />),
}));

const mockUseBasicDataFromDetailsData = useBasicDataFromDetailsData as jest.Mock;
const mockUseDocumentDetailsContext = useDocumentDetailsContext as jest.Mock;

describe('PanelHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tab name', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    const { getByText } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={jest.fn()} tabs={allThreeTabs} />
    );
    expect(getByText('Overview')).toBeInTheDocument();
  });

  it('should render event header title when isAlert equals false', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    const { queryByTestId } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={jest.fn()} tabs={allThreeTabs} />
    );
    expect(queryByTestId('alert-header')).not.toBeInTheDocument();
    expect(queryByTestId('event-header')).toBeInTheDocument();
  });

  it('should render alert header title when isAlert equals true', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: true });
    const { queryByTestId } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={jest.fn()} tabs={allThreeTabs} />
    );
    expect(queryByTestId('alert-header')).toBeInTheDocument();
    expect(queryByTestId('event-header')).not.toBeInTheDocument();
  });

  it('should not render the remote document callout for a local document', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    const { queryByText } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={jest.fn()} tabs={allThreeTabs} />
    );
    expect(queryByText(REMOTE_CALLOUT_TEXT)).not.toBeInTheDocument();
  });

  it('should render the remote document callout for a remote document', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    const { mockSearchHit } = jest.requireActual('../shared/mocks/mock_search_hit');
    mockUseDocumentDetailsContext.mockReturnValueOnce({
      dataFormattedForFieldBrowser: [],
      searchHit: { ...mockSearchHit, _index: 'remote-cluster:.alerts-security.alerts-default' },
    });
    const { getByText } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={jest.fn()} tabs={allThreeTabs} />
    );
    expect(getByText(REMOTE_CALLOUT_TEXT)).toBeInTheDocument();
  });
});
