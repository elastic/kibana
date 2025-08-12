/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { Color } from '../../../../common/color_palette';
import { ThresholdAnnotations } from './threshold_annotations';

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  const mockComponent = (props: any) => {
    // Stringify dataValues if it's an object
    const stringifiedProps = {
      ...props,
      dataValues: Array.isArray(props.dataValues)
        ? JSON.stringify(props.dataValues)
        : props.dataValues,
    };

    return <div data-testid="mock-annotation" {...stringifiedProps} />;
  };

  return {
    ...original,
    LineAnnotation: mockComponent,
    RectAnnotation: mockComponent,
  };
});

describe('ThresholdAnnotations', () => {
  const defaultProps = {
    threshold: [20, 30],
    sortedThresholds: [20, 30],
    comparator: COMPARATORS.GREATER_THAN,
    color: Color.color0,
    id: 'testId',
    firstTimestamp: 123456789,
    lastTimestamp: 987654321,
    domain: { min: 10, max: 20 },
  };

  const renderComponent = (props = {}) => {
    return render(<ThresholdAnnotations {...defaultProps} {...props} />);
  };

  it('should render a line annotation for each threshold', () => {
    renderComponent();
    const annotation = screen.getByTestId('threshold-line');

    expect(annotation).toHaveAttribute(
      'dataValues',
      JSON.stringify([{ dataValue: 20 }, { dataValue: 30 }])
    );
  });

  it('should render a rectangular annotation for in between thresholds', () => {
    renderComponent({ comparator: COMPARATORS.BETWEEN });
    const annotation = screen.getByTestId('between-rect');

    expect(annotation).toHaveAttribute(
      'dataValues',
      JSON.stringify([
        {
          coordinates: {
            x0: 123456789,
            x1: 987654321,
            y0: 20,
            y1: 30,
          },
        },
      ])
    );
  });

  it('should render an upper rectangular annotation for outside range thresholds', () => {
    renderComponent({ comparator: COMPARATORS.NOT_BETWEEN });
    const annotation = screen.getByTestId('outside-range-lower-rect');

    expect(annotation).toHaveAttribute(
      'dataValues',
      JSON.stringify([
        {
          coordinates: {
            x0: 123456789,
            x1: 987654321,
            y0: 10,
            y1: 20,
          },
        },
      ])
    );
  });

  it('should render a lower rectangular annotation for outside range thresholds', () => {
    renderComponent({ comparator: COMPARATORS.NOT_BETWEEN });
    const annotation = screen.getByTestId('outside-range-upper-rect');

    expect(annotation).toHaveAttribute(
      'dataValues',
      JSON.stringify([
        {
          coordinates: {
            x0: 123456789,
            x1: 987654321,
            y0: 30,
            y1: 20,
          },
        },
      ])
    );
  });

  it('should render a rectangular annotation for below thresholds', () => {
    renderComponent({ comparator: COMPARATORS.LESS_THAN });
    const annotation = screen.getByTestId('below-rect');

    expect(annotation).toHaveAttribute(
      'dataValues',
      JSON.stringify([
        {
          coordinates: {
            x0: 123456789,
            x1: 987654321,
            y0: 10,
            y1: 20,
          },
        },
      ])
    );
  });

  it('should render a rectangular annotation for above thresholds', () => {
    renderComponent({ comparator: COMPARATORS.GREATER_THAN });
    const annotation = screen.getByTestId('above-rect');

    expect(annotation).toHaveAttribute(
      'dataValues',
      JSON.stringify([
        {
          coordinates: {
            x0: 123456789,
            x1: 987654321,
            y0: 20,
            y1: 20,
          },
        },
      ])
    );
  });
});
