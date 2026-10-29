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
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { TestProviders } from '../../../common/mock';
import { ListDetailsFallbackAppHeader } from './list_details_fallback_app_header';

jest.mock('../../../common/lib/kibana');

jest.mock('../../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl:
    () =>
    ({ deepLinkId }: { deepLinkId: string }) =>
      `/app/security/${deepLinkId}`,
}));

jest.mock('../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));

jest.mock('../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));

describe('ListDetailsFallbackAppHeader', () => {
  it('renders a generic title with a link back to Shared Exception Lists', () => {
    render(
      <TestProviders>
        <MemoryRouter>
          <MockAppHeaderProvider>
            <ListDetailsFallbackAppHeader />
          </MockAppHeaderProvider>
        </MemoryRouter>
      </TestProviders>
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Exception list');
    const back = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(back).toHaveAttribute('href', '/app/security/exceptions');
    expect(back).toHaveAttribute('aria-label', 'Back to Shared Exception Lists');
  });
});
