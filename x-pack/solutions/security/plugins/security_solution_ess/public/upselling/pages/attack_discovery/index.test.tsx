/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import * as i18n from './translations';

jest.mock('../../../common/services', () => ({
  useKibana: jest.fn(() => ({
    services: {
      application: {
        getUrlForApp: jest
          .fn()
          .mockReturnValue('http://localhost:5601/app/management/stack/license_management'),
      },
      http: {
        basePath: {
          get: () => 'some-base-path',
        },
      },
    },
  })),
}));

import { AttackDiscoveryUpsellingPageESS } from '.';

describe('AttackDiscoveryUpsellingPageESS', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    render(<AttackDiscoveryUpsellingPageESS />);
  });

  it('renders the expected ESS-specific availability message', () => {
    const attackDiscoveryIsAvailable = screen.getByTestId('availabilityMessage');

    expect(attackDiscoveryIsAvailable).toHaveTextContent(i18n.AVAILABILITY_MESSAGE);
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
