/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { TestProviders } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import { SharedListsAppHeader } from './shared_lists_app_header';

jest.mock('../../../common/lib/kibana');

// "ML job settings" and "Add integrations" come from the shared SecurityAppHeader wrapper and are
// covered by its own test; stub the wrapper's hooks so this suite stays focused on the page items.
jest.mock('../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));

jest.mock('../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));

jest.mock('./use_last_updated_text', () => ({
  useLastUpdatedText: () => 'Updated now',
}));

const defaultProps = {
  canCreate: true,
  canImport: true,
  isLoading: false,
  lastUpdated: 0,
  onCreateSharedList: jest.fn(),
  onCreateExceptionItem: jest.fn(),
  onImport: jest.fn(),
};

const user = userEvent.setup({ pointerEventsCheck: 0 });

const renderHeader = (props: Partial<typeof defaultProps> = {}) =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <SharedListsAppHeader {...defaultProps} {...props} />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

describe('SharedListsAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page title', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Shared Exception Lists'
    );
  });

  it('renders the last updated text', () => {
    renderHeader();

    expect(screen.getByTestId('sharedListsLastUpdated')).toHaveTextContent('Updated now');
  });

  it('opens the Rules page in a new tab from the subtitle', async () => {
    const navigateToApp = jest.fn();
    const kibana = useKibana();
    (useKibana as jest.Mock).mockReturnValue({
      ...kibana,
      services: {
        ...kibana.services,
        application: { ...kibana.services.application, navigateToApp },
      },
    });
    renderHeader();

    await user.click(screen.getByTestId('sharedListsGoToRules'));

    expect(navigateToApp).toHaveBeenCalledWith('security', {
      openInNewTab: true,
      path: '/rules',
    });
  });

  it('opens the import flyout', async () => {
    const onImport = jest.fn();
    renderHeader({ onImport });
    await openAppMenuOverflow();

    await user.click(await screen.findByTestId('importSharedExceptionList'));

    expect(onImport).toHaveBeenCalled();
  });

  it('hides the import action when the user cannot import', async () => {
    renderHeader({ canImport: false });
    await openAppMenuOverflow();

    expect(screen.queryByTestId('importSharedExceptionList')).not.toBeInTheDocument();
  });

  it('shows a plus icon on the main create button', () => {
    renderHeader();

    expect(
      screen
        .getByTestId('manageExceptionListCreateButton')
        .querySelector('[data-euiicon-type="plusCircle"]')
    ).toBeInTheDocument();
  });

  it('opens the create shared list flyout from the main create button', async () => {
    const onCreateSharedList = jest.fn();
    renderHeader({ onCreateSharedList });

    await user.click(screen.getByTestId('manageExceptionListCreateButton'));

    expect(onCreateSharedList).toHaveBeenCalled();
  });

  it('does not repeat the create shared list action in the create menu', async () => {
    renderHeader();

    await user.click(await screen.findByTestId('manageExceptionListCreateButton-secondary-button'));

    expect(
      await screen.findByTestId('manageExceptionListCreateExceptionButton')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('manageExceptionListCreateExceptionListButton')
    ).not.toBeInTheDocument();
  });

  it('opens the add exception flyout from the create menu', async () => {
    const onCreateExceptionItem = jest.fn();
    renderHeader({ onCreateExceptionItem });

    await user.click(await screen.findByTestId('manageExceptionListCreateButton-secondary-button'));
    await user.click(await screen.findByTestId('manageExceptionListCreateExceptionButton'));

    expect(onCreateExceptionItem).toHaveBeenCalled();
  });

  it('hides the create menu when the user cannot create', () => {
    renderHeader({ canCreate: false });

    expect(screen.queryByTestId('manageExceptionListCreateButton')).not.toBeInTheDocument();
  });
});
