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

jest.mock('../shared/context', () => ({
  useDocumentDetailsContext: jest.fn().mockReturnValue({ dataFormattedForFieldBrowser: [] }),
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
});
