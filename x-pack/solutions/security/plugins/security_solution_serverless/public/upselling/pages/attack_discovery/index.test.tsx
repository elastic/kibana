/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import React from 'react';

import * as i18n from './translations';

vi.mock('../../../common/services', () => {
      const mocked = {
      useKibana: vi.fn(() => ({
        services: {
          http: {
            basePath: {
              get: () => 'some-base-path',
            },
          },
        },
      })),
    };
      return { ...mocked, default: mocked };
    });

import { AttackDiscoveryUpsellingPageServerless } from '.';

describe('AttackDiscoveryUpsellingPageServerless', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    render(<AttackDiscoveryUpsellingPageServerless />);
  });

  it('renders the expected serverless-specific availability message', () => {
    const attackDiscoveryIsAvailable = screen.getByTestId('availabilityMessage');

    expect(attackDiscoveryIsAvailable).toHaveTextContent(i18n.AVAILABILITY_MESSAGE);
  });

  it('renders the expected serverless-specific upgrade message', () => {
    const pleaseUpgrade = screen.getByTestId('upgradeMessage');

    expect(pleaseUpgrade).toHaveTextContent(i18n.UPGRADE_MESSAGE);
  });
});
