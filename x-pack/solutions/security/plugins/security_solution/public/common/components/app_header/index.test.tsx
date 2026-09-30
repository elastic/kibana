/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { SecurityAppHeader } from '.';
import { useAddIntegrationsMenuItem } from './use_add_integrations_menu_item';

jest.mock('./use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: jest.fn(),
}));

const renderWithProvider = (ui: React.ReactElement) =>
  render(<MockAppHeaderProvider>{ui}</MockAppHeaderProvider>);

describe('SecurityAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title', () => {
    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue(undefined);

    renderWithProvider(<SecurityAppHeader title="My page" />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('My page');
  });

  it('merges the "Add integrations" item into the caller-provided menu', async () => {
    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue({
      id: 'addIntegrations',
      label: 'Add integrations',
      iconType: 'indexOpen',
      href: '/app/integrations/browse',
      overflow: true,
      testId: 'securityAppHeaderAddIntegrations',
    });

    renderWithProvider(
      <SecurityAppHeader
        title="My page"
        menu={{
          items: [
            {
              id: 'myOwnItem',
              label: 'My own item',
              iconType: 'gear',
              run: jest.fn(),
              testId: 'myOwnItem',
            },
          ],
        }}
      />
    );

    await openAppMenuOverflow();

    expect(screen.getByTestId('myOwnItem')).toBeInTheDocument();
    expect(screen.getByTestId('securityAppHeaderAddIntegrations')).toBeInTheDocument();
  });

  it('does not add an integrations item when the hook returns undefined', async () => {
    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue(undefined);

    renderWithProvider(<SecurityAppHeader title="My page" />);

    expect(screen.queryByTestId('securityAppHeaderAddIntegrations')).not.toBeInTheDocument();
  });
});
