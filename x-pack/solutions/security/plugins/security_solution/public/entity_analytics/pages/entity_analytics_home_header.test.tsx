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

let mockIsExecutiveBriefEnabled = false;

jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: (feature: string) =>
    feature === 'entityAnalyticsExecutiveBriefEnabled' && mockIsExecutiveBriefEnabled,
}));

jest.mock('../components/executive_brief/flyout/executive_brief_flyout', () => ({
  ExecutiveBriefFlyout: ({ timeRange, onClose }: { timeRange: string; onClose: () => void }) => (
    <div data-test-subj="mockExecutiveBriefFlyout" data-time-range={timeRange}>
      <button type="button" data-test-subj="mockExecutiveBriefClose" onClick={onClose} />
    </div>
  ),
}));

jest.mock('../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl:
    () =>
    ({ deepLinkId, path = '' }: { deepLinkId: string; path?: string }) =>
      `/app/security/${deepLinkId}${path}`,
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>
    <MemoryRouter>{children}</MemoryRouter>
  </TestProviders>
);

describe('EntityAnalyticsHomeHeader', () => {
  beforeEach(() => {
    mockIsExecutiveBriefEnabled = false;
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

  describe('executive brief', () => {
    it('does not show the executive brief item when the flag is off', async () => {
      render(<EntityAnalyticsHomeHeader />, { wrapper: Wrapper });

      await openAppMenuOverflow();

      expect(
        screen.queryByTestId(ENTITY_ANALYTICS_HOME_EXECUTIVE_BRIEF_MENU_ITEM_TEST_ID)
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('mockExecutiveBriefFlyout')).not.toBeInTheDocument();
    });

    it('shows the executive brief item when the flag is on and opens the flyout with the page time range', async () => {
      mockIsExecutiveBriefEnabled = true;
      render(<EntityAnalyticsHomeHeader timeRange="30d" />, { wrapper: Wrapper });

      await openAppMenuOverflow();

      const item = screen.getByTestId(ENTITY_ANALYTICS_HOME_EXECUTIVE_BRIEF_MENU_ITEM_TEST_ID);
      expect(item).toHaveTextContent('Executive brief');
      expect(screen.queryByTestId('mockExecutiveBriefFlyout')).not.toBeInTheDocument();

      fireEvent.click(item);

      expect(screen.getByTestId('mockExecutiveBriefFlyout')).toHaveAttribute(
        'data-time-range',
        '30d'
      );

      fireEvent.click(screen.getByTestId('mockExecutiveBriefClose'));

      expect(screen.queryByTestId('mockExecutiveBriefFlyout')).not.toBeInTheDocument();
    });
  });
});
