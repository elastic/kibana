/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { TestProviders } from '../../../common/mock';
import { ListDetailsAppHeader } from './list_details_app_header';

jest.mock('../../../common/lib/kibana');

jest.mock('../../../common/components/link_to', () => ({
  getRuleDetailsUrl: (id: string) => `/id/${id}`,
  useGetSecuritySolutionUrl:
    () =>
    ({ deepLinkId, path = '' }: { deepLinkId: string; path?: string }) =>
      `/app/security/${deepLinkId}${path}`,
}));

jest.mock('../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));

jest.mock('../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));

const linkedRules = [
  { id: 'rule-1', name: 'Rule one', rule_id: 'r1', exceptions_list: [] },
  { id: 'rule-2', name: 'Rule two', rule_id: 'r2', exceptions_list: [] },
];

const defaultProps = {
  name: 'My list',
  description: 'My description',
  listId: 'my_list_id',
  linkedRules,
  isReadOnly: false,
  canUserEditList: true,
  onEditListDetails: jest.fn().mockResolvedValue(undefined),
  onExportList: jest.fn(),
  onDuplicateList: jest.fn(),
  onDeleteList: jest.fn(),
  onManageRules: jest.fn(),
};

const user = userEvent.setup({ pointerEventsCheck: 0 });

const renderHeader = (props: Partial<typeof defaultProps> = {}) =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <ListDetailsAppHeader {...defaultProps} {...props} />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

describe('ListDetailsAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the list name as title', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('My list');
  });

  it('links back to Shared Exception Lists', () => {
    renderHeader();

    const back = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(back).toHaveAttribute('href', '/app/security/exceptions');
    expect(back).toHaveAttribute('aria-label', 'Back to Shared Exception Lists');
  });

  it('renders the list id and description as metadata', () => {
    renderHeader();

    expect(screen.getByTestId('exceptionListManagementListID')).toHaveTextContent('my_list_id');
    expect(screen.getByTestId('exceptionListManagementDescription')).toHaveTextContent(
      'My description'
    );
  });

  it('omits the description metadata when the list has none', () => {
    renderHeader({ description: '' });

    expect(screen.queryByTestId('exceptionListManagementDescription')).not.toBeInTheDocument();
  });

  it('calls onManageRules from the Link rules primary action', async () => {
    renderHeader();

    await user.click(
      screen.getByTestId('exceptionListManagementRightSideMenuItemsLinkRulesButton')
    );

    expect(defaultProps.onManageRules).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['read only', { isReadOnly: true }],
    ['user cannot edit the list', { canUserEditList: false }],
  ])('hides the Link rules action when %s', (_, props) => {
    renderHeader(props);

    expect(
      screen.queryByTestId('exceptionListManagementRightSideMenuItemsLinkRulesButton')
    ).not.toBeInTheDocument();
  });

  it('lists the linked rules', async () => {
    renderHeader();

    await openAppMenuOverflow();
    await user.click(await screen.findByTestId('exceptionListManagementLinkedRulesMenu'));

    expect(await screen.findByText('Rule one')).toBeInTheDocument();
    expect(screen.getByText('Rule two')).toBeInTheDocument();
  });

  it('disables the linked rules menu when there are none', async () => {
    renderHeader({ linkedRules: [] });

    await openAppMenuOverflow();

    expect(await screen.findByTestId('exceptionListManagementLinkedRulesMenu')).toBeDisabled();
  });

  it.each([
    ['exceptionListManagementExportAction', 'onExportList'],
    ['exceptionListManagementDuplicateAction', 'onDuplicateList'],
    ['exceptionListManagementDeleteAction', 'onDeleteList'],
  ] as const)('runs %s', async (testId, handler) => {
    renderHeader();

    await openAppMenuOverflow();
    await user.click(await screen.findByTestId(testId));

    expect(defaultProps[handler]).toHaveBeenCalledTimes(1);
  });

  it('disables duplicate and delete when the user cannot edit the list', async () => {
    renderHeader({ canUserEditList: false });

    await openAppMenuOverflow();

    expect(await screen.findByTestId('exceptionListManagementDuplicateAction')).toBeDisabled();
    expect(screen.getByTestId('exceptionListManagementDeleteAction')).toBeDisabled();
    expect(screen.getByTestId('exceptionListManagementExportAction')).toBeEnabled();
  });

  it('edits the list details from the modal', async () => {
    renderHeader();

    await openAppMenuOverflow();
    await user.click(await screen.findByTestId('exceptionListManagementEditDetailsAction'));
    const nameInput = await screen.findByTestId('editModalNameTextField');
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed');
    await user.click(screen.getByTestId('editModalSaveBtn'));

    expect(defaultProps.onEditListDetails).toHaveBeenCalledWith({
      name: 'Renamed',
      description: 'My description',
    });
  });

  it('closes the edit modal after a successful save', async () => {
    renderHeader();

    await openAppMenuOverflow();
    await user.click(await screen.findByTestId('exceptionListManagementEditDetailsAction'));
    await user.click(await screen.findByTestId('editModalSaveBtn'));

    await waitFor(() => expect(screen.queryByTestId('editModalSaveBtn')).not.toBeInTheDocument());
  });

  it('keeps the edit modal open when saving fails', async () => {
    (defaultProps.onEditListDetails as jest.Mock).mockRejectedValueOnce(new Error('save failed'));
    renderHeader();

    await openAppMenuOverflow();
    await user.click(await screen.findByTestId('exceptionListManagementEditDetailsAction'));
    await user.click(await screen.findByTestId('editModalSaveBtn'));

    await waitFor(() => expect(defaultProps.onEditListDetails).toHaveBeenCalled());
    expect(screen.getByTestId('editModalSaveBtn')).toBeInTheDocument();
    expect(screen.queryByTestId('editModalProgess')).not.toBeInTheDocument();
  });

  it('hides the edit action when read only', async () => {
    renderHeader({ isReadOnly: true });

    await openAppMenuOverflow();

    expect(
      screen.queryByTestId('exceptionListManagementEditDetailsAction')
    ).not.toBeInTheDocument();
  });
});
