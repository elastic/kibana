/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { Welcome } from '.';
import { TestProviders } from '../../../../../common/mock';
import { FIRST_SET_UP, WELCOME_TO_ATTACK_DISCOVERY } from './translations';

describe('Welcome', () => {
  beforeEach(() => {
    render(
      <TestProviders>
        <Welcome />
      </TestProviders>
    );
  });

  it('renders the avatar', () => {
    const avatar = screen.getByTestId('emptyPromptAvatar');

    expect(avatar).toBeInTheDocument();
  });

  it('renders the expected title', () => {
    const title = screen.getByTestId('welcomeTitle');

    expect(title).toHaveTextContent(WELCOME_TO_ATTACK_DISCOVERY);
  });

  it('renders the expected body text', () => {
    const bodyText = screen.getByTestId('bodyText');

    expect(bodyText).toHaveTextContent(FIRST_SET_UP);
  });
});
