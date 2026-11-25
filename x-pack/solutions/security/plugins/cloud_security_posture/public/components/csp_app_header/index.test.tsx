/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Capabilities, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { TestProvider } from '../../test/test_provider';
import { SECURITY_FEATURE_ID } from '../../test/constants';
import { CspAppHeader } from '.';
import { ADD_INTEGRATIONS_MENU_ITEM_TEST_ID } from './use_add_integrations_menu_item';

const renderHeader = ({
  capabilities = {},
  menu,
}: {
  capabilities?: Record<string, Record<string, boolean>>;
  menu?: AppHeaderMenu;
} = {}) => {
  const coreStart = coreMock.createStart();
  const capabilitiesOverride: Capabilities = {
    ...coreStart.application.capabilities,
    ...capabilities,
  };
  const core: CoreStart = {
    ...coreStart,
    application: { ...coreStart.application, capabilities: capabilitiesOverride },
  };

  return render(
    <TestProvider core={core}>
      <CspAppHeader title="My page" menu={menu} />
    </TestProvider>
  );
};

describe('<CspAppHeader />', () => {
  it('renders the title', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('My page');
  });

  it('renders "Add integrations" and the documentation link in the app menu', async () => {
    renderHeader({ capabilities: { fleet: { read: true } } });

    await openAppMenuOverflow();

    expect(screen.getByTestId(ADD_INTEGRATIONS_MENU_ITEM_TEST_ID)).toHaveAttribute(
      'href',
      expect.stringContaining('/app/integrations/browse/security')
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toBeInTheDocument();
  });

  it('keeps caller-provided menu items', async () => {
    renderHeader({
      capabilities: { fleet: { read: true } },
      menu: {
        items: [
          { id: 'myItem', label: 'My item', iconType: 'gear', run: jest.fn(), testId: 'myItem' },
        ],
      },
    });

    await openAppMenuOverflow();

    expect(screen.getByTestId('myItem')).toBeInTheDocument();
    expect(screen.getByTestId(ADD_INTEGRATIONS_MENU_ITEM_TEST_ID)).toBeInTheDocument();
  });

  it('does not render "Add integrations" without Fleet read access', async () => {
    renderHeader({ capabilities: { fleet: { read: false } } });

    await openAppMenuOverflow();

    expect(screen.queryByTestId(ADD_INTEGRATIONS_MENU_ITEM_TEST_ID)).not.toBeInTheDocument();
  });

  it('does not render "Add integrations" in a Search AI Lake configuration', async () => {
    renderHeader({
      capabilities: { fleet: { read: true }, [SECURITY_FEATURE_ID]: { configurations: true } },
    });

    await openAppMenuOverflow();

    expect(screen.queryByTestId(ADD_INTEGRATIONS_MENU_ITEM_TEST_ID)).not.toBeInTheDocument();
  });
});
