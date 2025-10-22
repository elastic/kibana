/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Color } from '../../../../../common/custom_threshold_rule/color_palette';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { render } from '@testing-library/react';
import React from 'react';

import { ThresholdAnnotations } from './threshold_annotations';

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  const mockComponent = (props: {}) => {
    return <div {...props} />;
  };

  return {
    ...original,
    LineAnnotation: mockComponent,
    RectAnnotation: mockComponent,
  };
});

describe('ThresholdAnnotations', () => {
  async function setup(props = {}) {
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
    return render(<ThresholdAnnotations {...defaultProps} {...props} />);
  }

  it('should render a line annotation for each threshold', async () => {
    const { getByTestId } = await setup();

    const expectedValues = [{ dataValue: 20 }, { dataValue: 30 }];

    const thresholdLineElement = getByTestId('threshold-line');
    expect(thresholdLineElement).toBeInTheDocument();
    expect(thresholdLineElement.getAttribute('datavalues')).toEqual(expectedValues.toString());
  });

  it('should render a rectangular annotation for in between thresholds', async () => {
    const { getByTestId } = await setup({ comparator: COMPARATORS.BETWEEN });

    const betweenRect = getByTestId('between-rect');

    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 20,
          y1: 30,
        },
      },
    ];

    expect(betweenRect.getAttribute('datavalues')).toEqual(expectedValues.toString());
  });

  it('should render an upper rectangular annotation for outside range thresholds', async () => {
    const { getByTestId } = await setup({ comparator: COMPARATORS.NOT_BETWEEN });

    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 10,
          y1: 20,
        },
      },
    ];
    const annotation = getByTestId('outside-range-lower-rect');

    expect(annotation.getAttribute('datavalues')).toEqual(expectedValues.toString());
  });

  it('should render a lower rectangular annotation for outside range thresholds', async () => {
    const { getByTestId } = await setup({ comparator: COMPARATORS.NOT_BETWEEN });

    const annotation = getByTestId('outside-range-upper-rect');
    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 30,
          y1: 20,
        },
      },
    ];

    expect(annotation.getAttribute('datavalues')).toEqual(expectedValues.toString());
  });

  it('should render a rectangular annotation for below thresholds', async () => {
    const { getByTestId } = await setup({ comparator: COMPARATORS.LESS_THAN });

    const annotation = getByTestId('below-rect');
    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 10,
          y1: 20,
        },
      },
    ];

    expect(annotation.getAttribute('datavalues')).toEqual(expectedValues.toString());
  });

  it('should render a rectangular annotation for above thresholds', async () => {
    const { getByTestId } = await setup({ comparator: COMPARATORS.GREATER_THAN });

    const annotation = getByTestId('above-rect');
    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 20,
          y1: 20,
        },
      },
    ];

    expect(annotation.getAttribute('datavalues')).toEqual(expectedValues.toString());
  });
});
