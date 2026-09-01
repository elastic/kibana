/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { NormalizationMenu, NormalizationMode } from '.';

describe('NormalizationMenu', () => {
  const options = {
    baselineScale: 1,
    baselineTime: 100,
    comparisonScale: 2,
    comparisonTime: 200,
  };

  const renderMenu = () =>
    render(
      <NormalizationMenu mode={NormalizationMode.Scale} options={options} onChange={jest.fn()} />
    );

  it('gives both scale factor fields an accessible name matching their visible label', async () => {
    renderMenu();

    await userEvent.click(screen.getByTestId('profilingNormalizationMenuButton'));

    const fields = screen.getAllByRole('spinbutton', { name: 'Scale factor' });

    expect(fields).toHaveLength(2);
    expect(fields[0]).toHaveValue(options.baselineScale);
    expect(fields[1]).toHaveValue(options.comparisonScale);
  });
});
