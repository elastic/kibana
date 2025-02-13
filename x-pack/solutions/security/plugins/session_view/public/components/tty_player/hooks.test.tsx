/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { sessionViewIOEventsMock } from '../../../common/mocks/responses/session_view_io_events.mock';
import { useIOLines, useXtermPlayer, XtermPlayerDeps } from './hooks';
import type { ProcessEventsPage } from '../../../common';
import { DEFAULT_TTY_FONT_SIZE, DEFAULT_TTY_PLAYSPEED_MS } from '../../../common/constants';

const VIM_LINE_START = 22;

describe('TTYPlayer/hooks', () => {
  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  describe('useIOLines', () => {
    it('returns an array of "best effort" lines of tty output', async () => {
      const events = sessionViewIOEventsMock?.events?.map((event) => event._source);
      const initial: ProcessEventsPage[] = [{ events, total: events?.length }];

      const { result, rerender } = renderHook(({ pages }) => useIOLines(pages), {
        initialProps: { pages: initial },
      });

      expect(result.current.lines.length).toBeGreaterThan(0);
      expect(typeof result.current.lines[0].value).toBe('string');

      // test memoization
      let last = result.current.lines;
      rerender({ pages: initial });
      expect(result.current.lines === last).toBeTruthy();
      last = result.current.lines;
      rerender({ pages: [...initial] });
      expect(result.current.lines === last).toBeFalsy();
    });
  });

  describe('useXtermPlayer', () => {
    let initialProps: XtermPlayerDeps;

    beforeEach(() => {
      const events = sessionViewIOEventsMock?.events?.map((event) => event._source);
      const pages: ProcessEventsPage[] = [{ events, total: events?.length }];
      const { result } = renderHook(() => useIOLines(pages));
      const lines = result.current.lines;
      const div = document.createElement('div');
      const mockRef = { current: div };
      initialProps = {
        ref: mockRef,
        isPlaying: false,
        setIsPlaying: jest.fn(),
        lines,
        hasNextPage: false,
        fetchNextPage: () => null,
        isFetching: false,
        fontSize: DEFAULT_TTY_FONT_SIZE,
      };
    });

    it('mounts and renders the first line of output', async () => {
      const { result: xTermResult } = renderHook(useXtermPlayer, {
        initialProps,
      });

      const { terminal, currentLine, seekToLine } = xTermResult.current;

      // there is a minor delay in updates to xtermjs after writeln is called.
      await act(async () => jest.advanceTimersByTime(100));

      // check that first line rendered in xtermjs
      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('256');
      expect(currentLine).toBe(0);

      await act(async () => {
        seekToLine(VIM_LINE_START); // line where vim output starts
      });

      await act(async () => jest.advanceTimersByTime(100));

      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('#!/bin/env bash');
    });

    it('allows the user to seek to any line of output', async () => {
      const { result: xTermResult } = renderHook(useXtermPlayer, {
        initialProps,
      });

      await act(async () => {
        xTermResult.current.seekToLine(VIM_LINE_START); // line where vim output starts
      });

      await act(async () => jest.advanceTimersByTime(100));

      const { terminal, currentLine } = xTermResult.current;

      expect(currentLine).toBe(VIM_LINE_START);
      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('#!/bin/env bash');
    });

    it('allows the user to play', async () => {
      const { result, rerender } = renderHook(useXtermPlayer, {
        initialProps,
      });

      rerender({ ...initialProps, isPlaying: true });

      await act(async () => jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * 10));

      expect(result.current.currentLine).toBe(10);
    });

    it('allows the user to stop', async () => {
      const { result, rerender } = renderHook(useXtermPlayer, {
        initialProps,
      });

      rerender({ ...initialProps, isPlaying: true });

      await act(async () => jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * 10));

      expect(result.current.currentLine).toBe(10);

      rerender({ ...initialProps, isPlaying: false });

      await act(async () => jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * 10));

      expect(result.current.currentLine).toBe(10); // should not have advanced
    });

    it('should stop when it reaches the end of the array of lines', async () => {
      const { result, rerender } = renderHook(useXtermPlayer, {
        initialProps,
      });

      rerender({ ...initialProps, isPlaying: true });

      await act(async () =>
        jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * initialProps.lines.length + 100)
      );

      expect(result.current.currentLine).toBe(initialProps.lines.length - 1);
    });

    it('should not print the first line twice after playback starts', async () => {
      const { result, rerender } = renderHook(useXtermPlayer, {
        initialProps,
      });

      rerender({ ...initialProps, isPlaying: true });

      await act(async () => {
        // advance render loop
        jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS);
      });

      rerender({ ...initialProps, isPlaying: false });

      expect(result.current.terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('256');
    });

    it('ensure the first few render loops have printed the right lines', async () => {
      const { result, rerender } = renderHook(useXtermPlayer, {
        initialProps,
      });

      const LOOPS = 6;

      rerender({ ...initialProps, isPlaying: true });

      await act(async () => {
        // advance render loop
        jest.advanceTimersByTime(DEFAULT_TTY_PLAYSPEED_MS * LOOPS);
      });

      rerender({ ...initialProps, isPlaying: false });

      await waitFor(() => {
        expect(result.current.terminal.buffer.active.getLine(0)?.translateToString(true)).toBe(
          '256'
        );
        expect(result.current.terminal.buffer.active.getLine(1)?.translateToString(true)).toBe(',');
        expect(result.current.terminal.buffer.active.getLine(2)?.translateToString(true)).toBe(
          '                             Some Companies Puppet instance'
        );
        expect(result.current.terminal.buffer.active.getLine(3)?.translateToString(true)).toBe(
          '             |  |    |       CentOS Stream release 8 on x86_64'
        );
        expect(result.current.terminal.buffer.active.getLine(4)?.translateToString(true)).toBe(
          '  ***********************    Load average: 1.23, 1.01, 0.63'
        );
        expect(result.current.terminal.buffer.active.getLine(5)?.translateToString(true)).toBe(
          '  ************************   '
        );
        expect(result.current.currentLine).toBe(LOOPS);
      });
    });

    it('will allow a plain text search highlight on the last line printed', async () => {
      const { result: xTermResult } = renderHook(useXtermPlayer, {
        initialProps,
      });

      jest.advanceTimersByTime(100);

      act(() => {
        xTermResult.current.search('256', 0);
      });

      const { terminal } = xTermResult.current;

      expect(terminal.getSelection()).toBe('256');
    });
  });
});
