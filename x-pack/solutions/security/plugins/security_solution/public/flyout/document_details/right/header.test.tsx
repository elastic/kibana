/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import React from 'react';

import { renderWithI18n as render } from '@kbn/test-jest-helpers';

import { PanelHeader } from './header';
import { allThreeTabs } from './tabs';
import { useBasicDataFromDetailsData } from '../shared/hooks/use_basic_data_from_details_data';
import { useDocumentDetailsContext } from '../shared/context';
import { mockSearchHit } from '../shared/mocks/mock_search_hit';

const REMOTE_CALLOUT_TEXT =
  'This event originates from a remote cluster. Some features may not be available.';

vi.mock('../shared/context', () => {
  const mocked = {
    useDocumentDetailsContext: vi.fn().mockImplementation(() => ({
      dataFormattedForFieldBrowser: [],
      searchHit: mockSearchHit,
    })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../shared/hooks/use_basic_data_from_details_data', () => {
  const mocked = {
    useBasicDataFromDetailsData: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./components/alert_header_title', () => {
  const mocked = {
    AlertHeaderTitle: vi.fn(() => <div data-test-subj="alert-header" />),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./components/event_header_title', () => {
  const mocked = {
    EventHeaderTitle: vi.fn(() => <div data-test-subj="event-header" />),
  };
  return { ...mocked, default: mocked };
});

const mockUseBasicDataFromDetailsData = useBasicDataFromDetailsData as Mock;
const mockUseDocumentDetailsContext = useDocumentDetailsContext as Mock;

describe('PanelHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tab name', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    const { getByText } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={vi.fn()} tabs={allThreeTabs} />
    );
    expect(getByText('Overview')).toBeInTheDocument();
  });

  it('should render event header title when isAlert equals false', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    const { queryByTestId } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={vi.fn()} tabs={allThreeTabs} />
    );
    expect(queryByTestId('alert-header')).not.toBeInTheDocument();
    expect(queryByTestId('event-header')).toBeInTheDocument();
  });

  it('should render alert header title when isAlert equals true', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: true });
    const { queryByTestId } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={vi.fn()} tabs={allThreeTabs} />
    );
    expect(queryByTestId('alert-header')).toBeInTheDocument();
    expect(queryByTestId('event-header')).not.toBeInTheDocument();
  });

  it('should not render the remote document callout for a local document', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    const { queryByText } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={vi.fn()} tabs={allThreeTabs} />
    );
    expect(queryByText(REMOTE_CALLOUT_TEXT)).not.toBeInTheDocument();
  });

  it('should render the remote document callout for a remote document', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ isAlert: false });
    mockUseDocumentDetailsContext.mockReturnValueOnce({
      dataFormattedForFieldBrowser: [],
      searchHit: { ...mockSearchHit, _index: 'remote-cluster:.alerts-security.alerts-default' },
    });
    const { getByText } = render(
      <PanelHeader selectedTabId={'overview'} setSelectedTabId={vi.fn()} tabs={allThreeTabs} />
    );
    expect(getByText(REMOTE_CALLOUT_TEXT)).toBeInTheDocument();
  });
});
