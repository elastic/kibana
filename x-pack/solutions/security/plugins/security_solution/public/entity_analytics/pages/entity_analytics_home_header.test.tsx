/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { ADD_INTEGRATIONS_MENU_ITEM_TEST_ID } from '../../common/components/app_header/use_add_integrations_menu_item';
import { TestProviders } from '../../common/mock';
import {
  ENTITY_ANALYTICS_HOME_EXECUTIVE_BRIEF_MENU_ITEM_TEST_ID,
  ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID,
  EntityAnalyticsHomeHeader,
} from './entity_analytics_home_header';

jest.mock('../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl:
    () =>
    ({ deepLinkId, path = '' }: { deepLinkId: string; path?: string }) =>
      `/app/security/${deepLinkId}${path}`,
}));

const mockUseIsExperimentalFeatureEnabled = jest.fn();
jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: (feature: string) =>
    mockUseIsExperimentalFeatureEnabled(feature),
}));

jest.mock('../components/executive_brief', () => ({
  ExecutiveBriefFlyout: ({ timeRange }: { timeRange: string }) => (
    <div data-test-subj="executiveBriefFlyoutStub">{timeRange}</div>
  ),
  useExportBriefPdf: () => jest.fn(),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>
    <MemoryRouter>{children}</MemoryRouter>
  </TestProviders>
);

describe('EntityAnalyticsHomeHeader', () => {
  beforeEach(() => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
  });

  it('renders the shared page title and management menu item', async () => {
    render(<EntityAnalyticsHomeHeader />, { wrapper: Wrapper });

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Entity analytics'
    );
    expect(
      screen.queryByTestId(ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID)
    ).not.toBeInTheDocument();

    await openAppMenuOverflow();

    const settingsItem = screen.getByTestId(ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID);
    const addIntegrationsItem = screen.getByTestId(ADD_INTEGRATIONS_MENU_ITEM_TEST_ID);
    const documentationItem = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation);

    expect(addIntegrationsItem.compareDocumentPosition(settingsItem)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(settingsItem.compareDocumentPosition(documentationItem)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  describe('with the executive brief flag enabled', () => {
    beforeEach(() => {
      mockUseIsExperimentalFeatureEnabled.mockImplementation(
        (feature: string) => feature === 'entityAnalyticsExecutiveBriefEnabled'
      );
    });

    it('shows the AI brief item, keeps Add integrations, and opens the flyout with the page time range', async () => {
      render(<EntityAnalyticsHomeHeader timeRange="24h" />, { wrapper: Wrapper });

      await openAppMenuOverflow();
      expect(screen.getByTestId(ADD_INTEGRATIONS_MENU_ITEM_TEST_ID)).toBeInTheDocument();
      const briefButton = screen.getByTestId(
        ENTITY_ANALYTICS_HOME_EXECUTIVE_BRIEF_MENU_ITEM_TEST_ID
      );
      expect(briefButton).toHaveTextContent('Executive brief');
      expect(screen.queryByTestId('executiveBriefFlyoutStub')).not.toBeInTheDocument();

      fireEvent.click(briefButton);
      expect(screen.getByTestId('executiveBriefFlyoutStub')).toHaveTextContent('24h');
    });
  });
});
