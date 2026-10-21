/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { SecurityAppHeader } from '.';
import { useAddIntegrationsMenuItem } from './use_add_integrations_menu_item';
import { useMlJobSettingsMenuItem } from './use_ml_job_settings_menu_item';
import { ALERTS_PATH } from '../../../../common/constants';

jest.mock('./use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: jest.fn(),
}));
jest.mock('./use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: jest.fn(),
}));

const mockMlJobSettingsMenuItem = {
  id: 'mlJobSettings',
  label: 'ML job settings',
  iconType: 'machineLearningApp',
  overflow: true,
  run: jest.fn(),
  testId: 'securityAppHeaderMlJobSettings',
};

const renderWithProvider = (ui: React.ReactElement, pathname: string = '/') =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <MockAppHeaderProvider>{ui}</MockAppHeaderProvider>
    </MemoryRouter>
  );

describe('SecurityAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMlJobSettingsMenuItem as jest.Mock).mockReturnValue({ item: undefined, flyout: null });
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

  it('merges the "ML job settings" item and renders its flyout when open, on a detections route', async () => {
    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue(undefined);
    (useMlJobSettingsMenuItem as jest.Mock).mockReturnValue({
      item: mockMlJobSettingsMenuItem,
      flyout: <div data-test-subj="ml-settings-flyout-stub" />,
    });

    renderWithProvider(<SecurityAppHeader title="My page" />, ALERTS_PATH);

    await openAppMenuOverflow();

    expect(screen.getByTestId('securityAppHeaderMlJobSettings')).toBeInTheDocument();
    expect(screen.getByTestId('ml-settings-flyout-stub')).toBeInTheDocument();
  });

  it('does not show "ML job settings" outside detections routes, even if the hook returns an item', () => {
    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue(undefined);
    (useMlJobSettingsMenuItem as jest.Mock).mockReturnValue({
      item: mockMlJobSettingsMenuItem,
      flyout: null,
    });

    renderWithProvider(<SecurityAppHeader title="My page" />, '/some_other_page');

    expect(screen.queryByTestId('securityAppHeaderMlJobSettings')).not.toBeInTheDocument();
  });

  it('places "ML job settings" above "Add integrations" in the overflow', async () => {
    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue({
      id: 'addIntegrations',
      label: 'Add integrations',
      iconType: 'indexOpen',
      href: '/app/integrations/browse',
      overflow: true,
      testId: 'securityAppHeaderAddIntegrations',
    });
    (useMlJobSettingsMenuItem as jest.Mock).mockReturnValue({
      item: mockMlJobSettingsMenuItem,
      flyout: null,
    });

    renderWithProvider(<SecurityAppHeader title="My page" />, ALERTS_PATH);

    await openAppMenuOverflow();

    const mlItem = screen.getByTestId('securityAppHeaderMlJobSettings');
    const addIntegrationsItem = screen.getByTestId('securityAppHeaderAddIntegrations');
    expect(mlItem.compareDocumentPosition(addIntegrationsItem)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });
});
