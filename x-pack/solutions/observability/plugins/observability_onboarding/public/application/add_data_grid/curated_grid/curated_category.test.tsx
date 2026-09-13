/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import React from 'react';
import { CuratedCategorySection } from './curated_category';

expect.extend(matchers);

describe('CuratedCategorySection', () => {
  it('renders the label, children, and accessible-name wiring without any context providers', () => {
    render(
      <CuratedCategorySection id="cloud" label="Cloud">
        <div data-test-subj="categoryContent">Tile grid</div>
      </CuratedCategorySection>
    );

    expect(screen.getByText('Cloud')).toBeInTheDocument();
    expect(screen.getByTestId('categoryContent')).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 4, name: 'Cloud' });
    const section = heading.closest('section');
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
  });

  it('styles the label subdued and uppercase, matching the Add Data page category headings', () => {
    render(
      <CuratedCategorySection id="cloud" label="Cloud">
        <div />
      </CuratedCategorySection>
    );

    const heading = screen.getByRole('heading', { level: 4, name: 'Cloud' });
    expect(heading).toHaveStyleRule('text-transform', 'uppercase');
    expect(heading).toHaveStyleRule('color', /^#[0-9a-f]{6}$/i);
  });
});
