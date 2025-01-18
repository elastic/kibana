/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { PageTitle } from '.';
import { ATTACK_DISCOVERY_PAGE_TITLE } from './translations';

describe('PageTitle', () => {
  it('renders the expected title', () => {
    render(<PageTitle />);

    const attackDiscoveryPageTitle = screen.getByTestId('attackDiscoveryPageTitle');

    expect(attackDiscoveryPageTitle).toHaveTextContent(ATTACK_DISCOVERY_PAGE_TITLE);
  });
});
