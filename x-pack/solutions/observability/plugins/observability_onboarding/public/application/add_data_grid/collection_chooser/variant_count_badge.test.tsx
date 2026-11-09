/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { VariantCountBadge } from './variant_count_badge';

describe('VariantCountBadge', () => {
  it('names how many variants a card collapses', () => {
    render(<VariantCountBadge count={5} />);

    expect(screen.getByText('5 variants')).toBeInTheDocument();
  });

  it('keeps the count grammatical when a collection has one variant', () => {
    render(<VariantCountBadge count={1} />);

    expect(screen.getByText('1 variant')).toBeInTheDocument();
  });
});
