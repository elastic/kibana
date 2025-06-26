/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { matchers } from '@emotion/jest';

import { ChartPlaceHolder } from './chart_place_holder';
import type { ChartSeriesData } from './common';

expect.extend(matchers);

describe('ChartPlaceHolder', () => {
  const mockDataAllZeros = [
    {
      key: 'mockKeyA',
      color: 'mockColor',
      value: [
        { x: 'a', y: 0 },
        { x: 'b', y: 0 },
      ],
    },
    {
      key: 'mockKeyB',
      color: 'mockColor',
      value: [
        { x: 'a', y: 0 },
        { x: 'b', y: 0 },
      ],
    },
  ];
  const mockDataUnexpectedValue = [
    {
      key: 'mockKeyA',
      color: 'mockColor',
      value: [
        { x: 'a', y: '' },
        { x: 'b', y: 0 },
      ],
    },
    {
      key: 'mockKeyB',
      color: 'mockColor',
      value: [
        { x: 'a', y: {} },
        { x: 'b', y: 0 },
      ],
    },
  ];

  it('should render width and height from defaults', () => {
    render(<ChartPlaceHolder data={mockDataAllZeros} />);
    expect(screen.getByTestId('chartPlaceHolder')).toHaveStyle({ height: '100%', width: '100%' });
  });

  it('should render with given props', () => {
    const height = '100px';
    const width = '100px';
    render(<ChartPlaceHolder height={height} width={width} data={mockDataAllZeros} />);
    expect(screen.getByTestId('chartPlaceHolder')).toHaveStyle({
      height: '100px',
      width: '100px',
    });
  });

  it('should render correct wording when all values returned zero', () => {
    render(<ChartPlaceHolder data={mockDataAllZeros} />);
    expect(screen.getByTestId('chartHolderText')).toHaveTextContent('All values returned zero');
  });

  it('should render correct wording when unexpected value exists', () => {
    render(<ChartPlaceHolder data={mockDataUnexpectedValue as ChartSeriesData[]} />);
    expect(screen.getByTestId('chartHolderText')).toHaveTextContent('Chart Data Not Available');
  });
});
