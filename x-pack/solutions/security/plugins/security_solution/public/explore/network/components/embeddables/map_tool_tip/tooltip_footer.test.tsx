/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, render, fireEvent } from '@testing-library/react';
import React from 'react';
import { ToolTipFooterComponent } from './tooltip_footer';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ToolTipFilter', () => {
  let nextFeature = jest.fn();
  let previousFeature = jest.fn();

  beforeEach(() => {
    nextFeature = jest.fn();
    previousFeature = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const { container } = render(
      <ToolTipFooterComponent
        nextFeature={nextFeature}
        previousFeature={previousFeature}
        featureIndex={0}
        totalFeatures={100}
      />
    );
    expect(container.children[0]).toMatchSnapshot();
  });

  describe('Lower bounds', () => {
    test('previousButton is disabled when featureIndex is 0', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={0}
          totalFeatures={5}
        />
      );

      expect(screen.getByTestId('previous-feature-button')).toBeDisabled();
    });

    test('previousFeature is not called when featureIndex is 0', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={0}
          totalFeatures={5}
        />
      );

      fireEvent.click(screen.getByTestId('previous-feature-button'));

      expect(previousFeature).toHaveBeenCalledTimes(0);
    });

    test('nextButton is enabled when featureIndex is < totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={0}
          totalFeatures={5}
        />
      );

      expect(screen.getByTestId('next-feature-button')).not.toBeDisabled();
    });

    test('nextFeature is called when featureIndex is < totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={0}
          totalFeatures={5}
        />
      );

      fireEvent.click(screen.getByTestId('next-feature-button'));
      expect(nextFeature).toHaveBeenCalledTimes(1);
    });
  });

  describe('Upper bounds', () => {
    test('previousButton is enabled when featureIndex >== totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={4}
          totalFeatures={5}
        />
      );

      expect(screen.getByTestId('previous-feature-button')).not.toBeDisabled();
    });

    test('previousFunction is called when featureIndex >== totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={4}
          totalFeatures={5}
        />
      );

      fireEvent.click(screen.getByTestId('previous-feature-button'));
      expect(previousFeature).toHaveBeenCalledTimes(1);
    });

    test('nextButton is disabled when featureIndex >== totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={4}
          totalFeatures={5}
        />
      );

      expect(screen.getByTestId('next-feature-button')).toBeDisabled();
    });

    test('nextFunction is not called when featureIndex >== totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={4}
          totalFeatures={5}
        />
      );
      fireEvent.click(screen.getByTestId('next-feature-button'));
      expect(nextFeature).toHaveBeenCalledTimes(0);
    });
  });

  describe('Within bounds, single feature', () => {
    test('previousButton is not enabled when only a single feature is provided', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={0}
          totalFeatures={1}
        />
      );

      expect(screen.getByTestId('previous-feature-button')).toBeDisabled();
    });

    test('previousFunction is not called when only a single feature is provided', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={0}
          totalFeatures={1}
        />
      );

      fireEvent.click(screen.getByTestId('previous-feature-button'));
      expect(previousFeature).toHaveBeenCalledTimes(0);
    });

    test('nextButton is not enabled when only a single feature is provided', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={0}
          totalFeatures={1}
        />
      );

      expect(screen.getByTestId('next-feature-button')).toBeDisabled();
    });

    test('nextFunction is not called when only a single feature is provided', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={0}
          totalFeatures={1}
        />
      );

      fireEvent.click(screen.getByTestId('next-feature-button'));
      expect(nextFeature).toHaveBeenCalledTimes(0);
    });
  });

  describe('Within bounds, multiple features', () => {
    test('previousButton is enabled when featureIndex > 0 && featureIndex < totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={1}
          totalFeatures={5}
        />
      );

      expect(screen.getByTestId('previous-feature-button')).not.toBeDisabled();
    });

    test('previousFunction is called when featureIndex > 0 && featureIndex < totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={1}
          totalFeatures={5}
        />
      );

      fireEvent.click(screen.getByTestId('previous-feature-button'));
      expect(previousFeature).toHaveBeenCalledTimes(1);
    });

    test('nextButton is enabled when featureIndex > 0 && featureIndex < totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={1}
          totalFeatures={5}
        />
      );

      expect(screen.getByTestId('next-feature-button')).not.toBeDisabled();
    });

    test('nextFunction is called when featureIndex > 0 && featureIndex < totalFeatures', () => {
      render(
        <ToolTipFooterComponent
          nextFeature={nextFeature}
          previousFeature={previousFeature}
          featureIndex={1}
          totalFeatures={5}
        />
      );

      fireEvent.click(screen.getByTestId('next-feature-button'));
      expect(nextFeature).toHaveBeenCalledTimes(1);
    });
  });
});
