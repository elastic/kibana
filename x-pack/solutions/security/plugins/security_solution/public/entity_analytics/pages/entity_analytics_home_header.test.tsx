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

    await openAppMenuOverflow();

    expect(
      screen.getByTestId(ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID)
    ).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toBeInTheDocument();
  });
});
