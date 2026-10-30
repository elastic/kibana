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

import * as i18n from './translations';

const mockAttackDiscoveryDocLink = 'https://www.elastic.co/docs/attack-discovery';

jest.mock('../../../common/services', () => ({
  useKibana: jest.fn(() => ({
    services: {
      application: {
        getUrlForApp: jest
          .fn()
          .mockReturnValue('http://localhost:5601/app/management/stack/license_management'),
      },
      docLinks: {
        links: {
          siem: {
            attackDiscovery: mockAttackDiscoveryDocLink,
          },
        },
      },
      http: {
        basePath: {
          get: () => 'some-base-path',
        },
      },
    },
  })),
}));

import { AttacksUpsellingPageESS } from '.';

describe('AttacksUpsellingPageESS', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <MockAppHeaderProvider>
        <AttacksUpsellingPageESS />
      </MockAppHeaderProvider>
    );
  });

  it('renders the Attacks page title', () => {
    const title = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title);

    expect(title).toBeInTheDocument();
  });

  it('renders the Attack discovery documentation link', async () => {
    await openAppMenuOverflow();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      mockAttackDiscoveryDocLink
    );
  });

  it('renders the expected ESS-specific availability message', () => {
    const availabilityMessage = screen.getByTestId('availabilityMessage');

    expect(availabilityMessage).toHaveTextContent(i18n.AVAILABILITY_MESSAGE);
  });

  it('renders the expected ESS-specific upgrade message', () => {
    const pleaseUpgrade = screen.getByTestId('upgradeMessage');

    expect(pleaseUpgrade).toHaveTextContent(i18n.UPGRADE_MESSAGE);
  });

  it('renders the ESS-specific actions', () => {
    const actions = screen.getByTestId('essActions');

    expect(actions).toBeInTheDocument();
  });
});
