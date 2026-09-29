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

import { AttacksUpsellingPageServerless } from '.';

describe('AttacksUpsellingPageServerless', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    render(<AttacksUpsellingPageServerless />);
  });

  it('renders the Attacks page title', () => {
    const title = screen.getByTestId('attacksPageTitle');

    expect(title).toBeInTheDocument();
  });

  it('renders the expected serverless-specific availability message', () => {
    const availabilityMessage = screen.getByTestId('availabilityMessage');

    expect(availabilityMessage).toHaveTextContent(i18n.AVAILABILITY_MESSAGE);
  });

  it('renders the expected serverless-specific upgrade message', () => {
    const pleaseUpgrade = screen.getByTestId('upgradeMessage');

    expect(pleaseUpgrade).toHaveTextContent(i18n.UPGRADE_MESSAGE);
  });
});
