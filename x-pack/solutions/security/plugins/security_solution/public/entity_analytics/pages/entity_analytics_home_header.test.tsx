/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { ADD_INTEGRATIONS_MENU_ITEM_TEST_ID } from '../../common/components/app_header/use_add_integrations_menu_item';
import { TestProviders } from '../../common/mock';
import {
  ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID,
  EntityAnalyticsHomeHeader,
} from './entity_analytics_home_header';

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
});
