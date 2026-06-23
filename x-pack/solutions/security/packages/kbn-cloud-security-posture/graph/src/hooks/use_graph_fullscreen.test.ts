/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useGraphFullscreen } from './use_graph_fullscreen';

describe('useGraphFullscreen', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    document.exitFullscreen = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    });
    target.requestFullscreen = jest.fn().mockImplementation(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => target,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
  });

  afterEach(() => {
    target.remove();
    jest.restoreAllMocks();
  });

  it('enters fullscreen on toggle', async () => {
    const targetRef = { current: target };
    const { result } = renderHook(() => useGraphFullscreen(targetRef));

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(target.requestFullscreen).toHaveBeenCalled();
    expect(result.current.isFullscreen).toBe(true);
  });

  it('exits fullscreen when already fullscreen', async () => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => target,
    });

    const targetRef = { current: target };
    const { result } = renderHook(() => useGraphFullscreen(targetRef));

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(document.exitFullscreen).toHaveBeenCalled();
  });
});
