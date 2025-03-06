/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useWindowWidth } from './use_window_width';
import { useDispatch } from '../store/redux';
import { setDefaultWidthsAction } from '../store/actions';

jest.mock('../store/redux');

describe('useWindowWidth', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the window size and dispatch setDefaultWidthsAction', () => {
    global.innerWidth = 1024;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(1024);
    expect(mockUseDispatch).toHaveBeenCalled();
  });

  it('should not dispatch action if window.innerWidth is 0', () => {
    global.innerWidth = 0;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(0);
    expect(mockUseDispatch).not.toHaveBeenCalled();
  });

  it('should handle screens below 380px', () => {
    global.innerWidth = 300;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(300);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        leftOverlay: -48,
        leftPush: 380,
        previewOverlay: 300,
        previewPush: 300,
        rightOverlay: 300,
        rightPush: 300,
      })
    );
  });

  it('should handle screens between 380px and 992px', () => {
    global.innerWidth = 500;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(500);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        leftOverlay: 72,
        leftPush: 380,
        previewOverlay: 380,
        previewPush: 380,
        rightOverlay: 380,
        rightPush: 380,
      })
    );
  });

  it('should handle screens between 992px and 1600px', () => {
    global.innerWidth = 1000;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    const rightOverlay = 380 + (750 - 380) * ((1000 - 992) / (1920 - 992));
    const leftOverlay = 1000 - rightOverlay - 48;
    const previewOverlay = rightOverlay;
    const rightPush = 380 + (600 - 380) * ((1000 - 1600) / (2560 - 1600));
    const leftPush = 380;
    const previewPush = rightPush;

    expect(hookResult.result.current).toEqual(1000);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        rightOverlay,
        leftOverlay,
        previewOverlay,
        leftPush,
        previewPush,
        rightPush,
      })
    );
  });

  it('should handle screens between 1600px and 1920', () => {
    global.innerWidth = 1800;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    const rightOverlay = 380 + (750 - 380) * ((1800 - 992) / (1920 - 992));
    const leftOverlay = ((1800 - rightOverlay) * 80) / 100;
    const previewOverlay = rightOverlay;
    const rightPush = 380 + (600 - 380) * ((1800 - 1600) / (2560 - 1600));
    const leftPush = ((1800 - rightPush - 200) * 40) / 100;
    const previewPush = rightPush;

    expect(hookResult.result.current).toEqual(1800);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        rightOverlay,
        leftOverlay,
        previewOverlay,
        leftPush,
        previewPush,
        rightPush,
      })
    );
  });

  it('should handle screens between 1920px and 2560px', () => {
    global.innerWidth = 2400;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    const leftOverlay = ((2400 - 750) * 80) / 100;
    const rightPush = 380 + (600 - 380) * ((2400 - 1600) / (2560 - 1600));
    const leftPush = ((2400 - rightPush - 200) * 40) / 100;
    const previewPush = rightPush;

    expect(hookResult.result.current).toEqual(2400);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        rightOverlay: 750,
        leftOverlay,
        previewOverlay: 750,
        leftPush,
        previewPush,
        rightPush,
      })
    );
  });

  it('should handle screens above 2560px', () => {
    global.innerWidth = 3800;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(3800);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        leftOverlay: 1500,
        leftPush: 1200,
        previewOverlay: 750,
        previewPush: 600,
        rightOverlay: 750,
        rightPush: 600,
      })
    );
  });
});
