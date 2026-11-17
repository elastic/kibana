/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SectionTitle } from './section';

describe('SectionTitle', () => {
  it('renders the title as text, not as a heading', () => {
    render(<SectionTitle>Host details</SectionTitle>);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Host details')).toBeInTheDocument();
  });
});
