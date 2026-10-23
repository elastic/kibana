/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { TestProviders } from '../../../../../../common/mock';
import { ConsolePageOverlay } from './console_page_overlay';
import type { ConsolePageOverlayProps } from './console_page_overlay';

// "Add integrations" is Security's own cross-page menu item with its own test coverage
// (`use_add_integrations_menu_item.test.ts`); stub it here so this suite stays focused on the
// console overlay's own header contract and doesn't need a `NavigationProvider`.
jest.mock('../../../../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));

const defaultProps: ConsolePageOverlayProps = {
  console: <div data-test-subj="fakeConsole" />,
  isHidden: false,
  onHide: jest.fn(),
  pageTitle: 'Response console',
};

const renderOverlay = (props: Partial<ConsolePageOverlayProps> = {}) =>
  render(
    <TestProviders>
      <MemoryRouter initialEntries={['/app/security/administration/endpoints']}>
        <ConsolePageOverlay {...defaultProps} {...props} />
      </MemoryRouter>
    </TestProviders>
  );

describe('ConsolePageOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the console content', () => {
    renderOverlay();

    expect(screen.getByTestId('fakeConsole')).toBeInTheDocument();
  });

  it('renders the page title in the AppHeaderView title', () => {
    renderOverlay();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Response console'
    );
  });

  it('renders a back button that calls `onHide`', async () => {
    const onHide = jest.fn();
    renderOverlay({ onHide });

    const backButton = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(backButton).toBeInTheDocument();

    await userEvent.click(backButton);

    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('does not render the header when hidden, but keeps the console mounted', () => {
    renderOverlay({ isHidden: true });

    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.title)).not.toBeInTheDocument();
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('fakeConsole')).toBeInTheDocument();
  });

  it('renders the primary action contributed via the `menu` prop', async () => {
    const run = jest.fn();
    renderOverlay({
      menu: {
        primaryActionItem: {
          id: 'responseActionsHistory',
          label: 'Response actions history',
          iconType: 'listBullet',
          run,
          testId: 'responderShowActionLogButton',
        },
      },
    });

    const primaryAction = screen.getByTestId('responderShowActionLogButton');
    await userEvent.click(primaryAction);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('renders the Documentation menu item when a `docLink` is resolvable', async () => {
    renderOverlay();
    await openAppMenuOverflow();

    expect(
      await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)
    ).toBeInTheDocument();
  });

  it.each([
    ['header back button', APP_HEADER_TEST_SUBJECTS.back],
    ['console body', 'fakeConsole'],
  ])('stops `Escape` pressed on the %s from reaching the document', (_, testSubj) => {
    renderOverlay();
    const documentListener = jest.fn();
    document.addEventListener('keydown', documentListener);

    fireEvent.keyDown(screen.getByTestId(testSubj), { key: 'Escape' });
    fireEvent.keyDown(screen.getByTestId(testSubj), { key: 'Enter' });

    expect(documentListener).toHaveBeenCalledTimes(1);
    expect(documentListener).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }));

    document.removeEventListener('keydown', documentListener);
  });
});
