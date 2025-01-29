/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { renderHook } from '@testing-library/react';

import { useDarkMode } from '../../lib/kibana';
import type { ChartSeriesData } from './common';
import {
  checkIfAllValuesAreZero,
  defaultChartHeight,
  getChartHeight,
  getChartWidth,
  WrappedByAutoSizer,
  useThemes,
} from './common';
import { LEGACY_LIGHT_THEME, LEGACY_DARK_THEME } from '@elastic/charts';

jest.mock('../../lib/kibana');

describe('WrappedByAutoSizer', () => {
  it('should render correct default height', () => {
    const wrapper = shallow(<WrappedByAutoSizer />);
    expect(wrapper).toHaveStyleRule('height', defaultChartHeight);
  });

  it('should render correct given height', () => {
    const wrapper = shallow(<WrappedByAutoSizer height="100px" />);
    expect(wrapper).toHaveStyleRule('height', '100px');
  });
});

describe('getChartHeight', () => {
  it('should render customHeight', () => {
    const height = getChartHeight(10, 100);
    expect(height).toEqual('10px');
  });

  it('should render autoSizerHeight if customHeight is not given', () => {
    const height = getChartHeight(undefined, 100);
    expect(height).toEqual('100px');
  });

  it('should render defaultChartHeight if no custom data is given', () => {
    const height = getChartHeight();
    expect(height).toEqual(defaultChartHeight);
  });
});

describe('getChartWidth', () => {
  it('should render customWidth', () => {
    const height = getChartWidth(10, 100);
    expect(height).toEqual('10px');
  });

  it('should render autoSizerHeight if customHeight is not given', () => {
    const height = getChartWidth(undefined, 100);
    expect(height).toEqual('100px');
  });

  it('should render defaultChartHeight if no custom data is given', () => {
    const height = getChartWidth();
    expect(height).toEqual(defaultChartHeight);
  });
});

describe('checkIfAllValuesAreZero', () => {
  const mockInvalidDataSets: Array<[ChartSeriesData[]]> = [
    [
      [
        {
          key: 'mockKey',
          color: 'mockColor',
          value: [
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
    ],
    [
      [
        {
          key: 'mockKeyA',
          color: 'mockColor',
          value: [
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        },
        {
          key: 'mockKeyB',
          color: 'mockColor',
          value: [
            { x: 1, y: 0 },
            { x: 1, y: 0 },
          ],
        },
      ],
    ],
  ];
  const mockValidDataSets: Array<[ChartSeriesData[]]> = [
    [
      [
        {
          key: 'mockKey',
          color: 'mockColor',
          value: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
        },
      ],
    ],
    [
      [
        {
          key: 'mockKeyA',
          color: 'mockColor',
          value: [
            { x: 1, y: 0 },
            { x: 3, y: 0 },
          ],
        },
        {
          key: 'mockKeyB',
          color: 'mockColor',
          value: [
            { x: 2, y: 0 },
            { x: 4, y: 0 },
          ],
        },
      ],
    ],
  ];

  describe.each(mockInvalidDataSets)('with data [%o]', (data) => {
    let result: boolean;
    beforeAll(() => {
      result = checkIfAllValuesAreZero(data);
    });

    it(`should return false`, () => {
      expect(result).toBeFalsy();
    });
  });

  describe.each(mockValidDataSets)('with data [%o]', (data) => {
    let result: boolean;
    beforeAll(() => {
      result = checkIfAllValuesAreZero(data);
    });

    it(`should return true`, () => {
      expect(result).toBeTruthy();
    });
  });

  describe('useThemes', () => {
    it('should return custom spacing theme', () => {
      const { result } = renderHook(() => useThemes());

      expect(result.current.theme.chartMargins).toMatchObject({ top: 4, bottom: 0 });
    });

    it('should return light baseTheme when isDarkMode false', () => {
      (useDarkMode as jest.Mock).mockImplementation(() => false);
      const { result } = renderHook(() => useThemes());

      expect(result.current.baseTheme).toBe(LEGACY_LIGHT_THEME);
    });

    it('should return dark baseTheme when isDarkMode true', () => {
      (useDarkMode as jest.Mock).mockImplementation(() => true);
      const { result } = renderHook(() => useThemes());

      expect(result.current.baseTheme).toBe(LEGACY_DARK_THEME);
    });
  });
});
