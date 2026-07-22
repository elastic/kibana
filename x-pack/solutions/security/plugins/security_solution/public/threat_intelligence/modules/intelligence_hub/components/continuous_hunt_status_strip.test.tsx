/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ContinuousHuntStatusStrip } from './continuous_hunt_status_strip';

const renderStrip = () =>
  render(
    <I18nProvider>
      <ContinuousHuntStatusStrip />
    </I18nProvider>
  );

describe('ContinuousHuntStatusStrip', () => {
  it('renders the new findings badge on initial display', () => {
    renderStrip();

    expect(screen.getByTestId('threatIntelContinuousHuntNewFindingsBadge')).toBeInTheDocument();
  });

  it('renders the quiet cycle message after one click', () => {
    renderStrip();
    fireEvent.click(screen.getByTestId('threatIntelContinuousHuntStatusStrip'));

    expect(screen.getByTestId('threatIntelContinuousHuntQuietMessage')).toBeInTheDocument();
  });

  it('renders tier progress after two clicks', () => {
    renderStrip();
    const strip = screen.getByTestId('threatIntelContinuousHuntStatusStrip');
    fireEvent.click(strip);
    fireEvent.click(strip);

    expect(screen.getByTestId('threatIntelContinuousHuntTierProgress')).toBeInTheDocument();
  });

  it('cycles back to the new findings badge after three clicks', () => {
    renderStrip();
    const strip = screen.getByTestId('threatIntelContinuousHuntStatusStrip');
    fireEvent.click(strip);
    fireEvent.click(strip);
    fireEvent.click(strip);

    expect(screen.getByTestId('threatIntelContinuousHuntNewFindingsBadge')).toBeInTheDocument();
  });
});
