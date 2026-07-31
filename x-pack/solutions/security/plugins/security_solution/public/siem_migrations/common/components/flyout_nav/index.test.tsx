/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MigrationFlyoutNav } from '.';

const baseNavigation = {
  hasPrevious: true,
  hasNext: true,
  goToPrevious: jest.fn(),
  goToNext: jest.fn(),
};

const renderNav = (navigationOverrides = {}, isDisabled = false) =>
  render(
    <MigrationFlyoutNav
      navigation={{ ...baseNavigation, ...navigationOverrides }}
      isDisabled={isDisabled}
      previousButtonTestSubj="previousButton"
      nextButtonTestSubj="nextButton"
    />
  );

describe('MigrationFlyoutNav', () => {
  it('moves the user to the previous item on click', () => {
    const goToPrevious = jest.fn();
    const { getByTestId } = renderNav({ goToPrevious });
    fireEvent.click(getByTestId('previousButton'));
    expect(goToPrevious).toHaveBeenCalled();
  });

  it('moves the user to the next item on click', () => {
    const goToNext = jest.fn();
    const { getByTestId } = renderNav({ goToNext });
    fireEvent.click(getByTestId('nextButton'));
    expect(goToNext).toHaveBeenCalled();
  });

  it('prevents moving backward when there is no previous item', () => {
    const { getByTestId } = renderNav({ hasPrevious: false });
    expect(getByTestId('previousButton')).toBeDisabled();
  });

  it('prevents moving forward when there is no next item', () => {
    const { getByTestId } = renderNav({ hasNext: false });
    expect(getByTestId('nextButton')).toBeDisabled();
  });

  it('disables both controls while data is loading', () => {
    const { getByTestId } = renderNav({}, true);
    expect(getByTestId('previousButton')).toBeDisabled();
    expect(getByTestId('nextButton')).toBeDisabled();
  });
});
