/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { RecommendedBadge } from './recommended_badge';

describe('RecommendedBadge', () => {
  it('labels the variant the host wants picked first, without any context providers', () => {
    render(<RecommendedBadge />);

    const badge = screen.getByTestId('collectionVariantRecommendedBadge');
    expect(badge).toHaveTextContent('Recommended');
  });
});
