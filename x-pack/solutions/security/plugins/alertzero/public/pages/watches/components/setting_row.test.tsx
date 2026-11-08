/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingRow } from './setting_row';

const renderRow = () =>
  render(
    <SettingRow label="Autonomy" data-test-subj="row">
      <span>control</span>
    </SettingRow>
  );

describe('SettingRow layout', () => {
  it('aligns every row on a fixed label column and a fluid control column', () => {
    renderRow();

    expect(screen.getByTestId('row')).toHaveStyleRule(
      'grid-template-columns',
      '200px minmax(0,1fr)'
    );
  });

  it('collapses to one column below 960px so the control keeps its width', () => {
    // The fixed 200px label column plus the 24px gap starves the control column at narrow
    // widths: fact values clipped mid-word below ~1000px and collapsed to zero around 800px.
    renderRow();

    expect(screen.getByTestId('row')).toHaveStyleRule('grid-template-columns', 'minmax(0,1fr)', {
      media: '(max-width: 960px)',
    });
  });
});
