/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';

import { AttacksUpsellingPage } from '.';
import { ATTACKS_PAGE_TITLE } from './translations';

const availabilityMessage = 'This feature is available...';
const upgradeMessage = 'Please upgrade...';
const docLink = 'https://www.elastic.co/docs/attacks';

const mockActions = <div data-test-subj="mockActions" />;

jest.mock('@kbn/security-solution-navigation', () => {
  const original = jest.requireActual('@kbn/security-solution-navigation');
  return {
    ...original,
    useNavigation: () => ({
      navigateTo: jest.fn(),
    }),
  };
});

describe('AttacksUpsellingPage', () => {
  beforeEach(() => {
    render(
      <MockAppHeaderProvider>
        <AttacksUpsellingPage
          actions={mockActions}
          availabilityMessage={availabilityMessage}
          docLink={docLink}
          upgradeMessage={upgradeMessage}
        />
      </MockAppHeaderProvider>
    );
  });

  it('renders the Attacks page title in the app header', () => {
    const title = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title);

    expect(title).toHaveTextContent(ATTACKS_PAGE_TITLE);
  });

  it('renders the documentation link in the app header menu', async () => {
    await openAppMenuOverflow();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      docLink
    );
  });

  it('renders the availability message', () => {
    const attacksIsAvailable = screen.getByTestId('availabilityMessage');

    expect(attacksIsAvailable).toHaveTextContent(availabilityMessage);
  });

  it('renders the upgrade message', () => {
    const pleaseUpgrade = screen.getByTestId('upgradeMessage');

    expect(pleaseUpgrade).toHaveTextContent(upgradeMessage);
  });

  it('renders the actions', () => {
    const actions = screen.getByTestId('mockActions');

    expect(actions).toBeInTheDocument();
  });
});

describe('AttacksUpsellingPage with a custom app header', () => {
  it('renders the provided app header with the page title and doc link', () => {
    const MockAppHeader = jest.fn(() => null);

    render(
      <AttacksUpsellingPage
        appHeader={MockAppHeader}
        availabilityMessage={availabilityMessage}
        docLink={docLink}
        upgradeMessage={upgradeMessage}
      />
    );

    expect(MockAppHeader).toHaveBeenCalledWith(
      expect.objectContaining({ title: ATTACKS_PAGE_TITLE, docLink }),
      expect.anything()
    );
  });
});
