/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { ENTITY_CHIP_ROW_GAP_PX, EntityChipRow } from '.';

const row = (): HTMLElement => screen.getByTestId('child').parentElement as HTMLElement;

describe('EntityChipRow', () => {
  it('renders its chips', () => {
    renderWithPndProviders(
      <EntityChipRow>
        <span data-test-subj="child">{'web-1'}</span>
      </EntityChipRow>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('lays the chips out as a flex row', () => {
    renderWithPndProviders(
      <EntityChipRow>
        <span data-test-subj="child">{'web-1'}</span>
      </EntityChipRow>
    );

    expect(row()).toHaveStyleRule('display', 'flex');
  });

  /** Wrapping is what makes the overflow measurement meaningful: more chips means more rows. */
  it('wraps the chips onto more rows', () => {
    renderWithPndProviders(
      <EntityChipRow>
        <span data-test-subj="child">{'web-1'}</span>
      </EntityChipRow>
    );

    expect(row()).toHaveStyleRule('flex-wrap', 'wrap');
  });

  /**
   * The gap is the same number the row-packing helper is told about, so what is measured and what is
   * drawn cannot drift apart.
   */
  it('separates the chips by the shared gap', () => {
    renderWithPndProviders(
      <EntityChipRow>
        <span data-test-subj="child">{'web-1'}</span>
      </EntityChipRow>
    );

    expect(row()).toHaveStyleRule('gap', `${ENTITY_CHIP_ROW_GAP_PX}px`);
  });
});
