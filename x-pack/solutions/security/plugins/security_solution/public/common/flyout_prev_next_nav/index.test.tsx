/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { FlyoutPrevNextNav } from '.';

const baseNavigation = {
  hasPrevious: true,
  hasNext: true,
  goToPrevious: jest.fn(),
  goToNext: jest.fn(),
};

const renderNav = (navigationOverrides = {}, isDisabled = false) =>
  render(
    <FlyoutPrevNextNav
      navigation={{ ...baseNavigation, ...navigationOverrides }}
      isDisabled={isDisabled}
    />
  );

describe('FlyoutPrevNextNav', () => {
  it('should move the user to the previous item on click', () => {
    const goToPrevious = jest.fn();
    const { getByTestId } = renderNav({ goToPrevious });
    fireEvent.click(getByTestId('flyoutPrevNextNavPreviousButton'));
    expect(goToPrevious).toHaveBeenCalled();
  });

  it('should move the user to the next item on click', () => {
    const goToNext = jest.fn();
    const { getByTestId } = renderNav({ goToNext });
    fireEvent.click(getByTestId('flyoutPrevNextNavNextButton'));
    expect(goToNext).toHaveBeenCalled();
  });

  it('should prevent moving backward when there is no previous item', () => {
    const { getByTestId } = renderNav({ hasPrevious: false });
    expect(getByTestId('flyoutPrevNextNavPreviousButton')).toBeDisabled();
  });

  it('should prevent moving forward when there is no next item', () => {
    const { getByTestId } = renderNav({ hasNext: false });
    expect(getByTestId('flyoutPrevNextNavNextButton')).toBeDisabled();
  });

  it('should disable both controls while data is loading', () => {
    const { getByTestId } = renderNav({}, true);
    expect(getByTestId('flyoutPrevNextNavPreviousButton')).toBeDisabled();
    expect(getByTestId('flyoutPrevNextNavNextButton')).toBeDisabled();
  });
});
