/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { LiveTimer } from '.';
import type { LiveTimerRenderProps } from '.';
import { TestProviders } from '../../../../common/mock';

describe('LiveTimer', () => {
  let nowMs = 0;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllTimers();
    nowMs = 0;

    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('basic rendering', () => {
    it('renders the formatted initial time', () => {
      render(
        <TestProviders>
          <LiveTimer initialTimeMs={500} isRunning={false} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('500ms');
    });

    it('renders with default test subject', () => {
      render(
        <TestProviders>
          <LiveTimer initialTimeMs={500} isRunning={false} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toBeInTheDocument();
    });

    it('renders with custom test subject', () => {
      render(
        <TestProviders>
          <LiveTimer data-test-subj="customTimer" initialTimeMs={500} isRunning={false} />
        </TestProviders>
      );

      expect(screen.getByTestId('customTimer')).toBeInTheDocument();
    });

    it('returns null when duration is zero', () => {
      const { container } = render(
        <TestProviders>
          <LiveTimer initialTimeMs={0} isRunning={false} />
        </TestProviders>
      );

      expect(container.querySelector('[data-test-subj="liveTimer"]')).not.toBeInTheDocument();
    });
  });

  describe('timer updates', () => {
    it('updates the displayed time when running', () => {
      nowMs = 1000;

      render(
        <TestProviders>
          <LiveTimer initialTimeMs={500} isRunning={true} />
        </TestProviders>
      );

      act(() => {
        nowMs = 1100;
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('600ms');
    });

    it('updates every 100ms when isRunning is true', () => {
      nowMs = 0;

      render(
        <TestProviders>
          <LiveTimer initialTimeMs={100} isRunning={true} />
        </TestProviders>
      );

      // Check initial render shows initial time
      expect(screen.getByTestId('liveTimer')).toHaveTextContent('100ms');

      // Advance by 100ms
      act(() => {
        nowMs = 100;
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('200ms');

      // Advance by another 100ms
      act(() => {
        nowMs = 200;
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('300ms');
    });

    it('stops updating when not running', () => {
      const { rerender } = render(
        <TestProviders>
          <LiveTimer initialTimeMs={0} isRunning={true} />
        </TestProviders>
      );

      act(() => {
        nowMs = 100;
        jest.advanceTimersByTime(100);
      });

      rerender(
        <TestProviders>
          <LiveTimer initialTimeMs={0} isRunning={false} />
        </TestProviders>
      );

      act(() => {
        nowMs = 1000;
        jest.advanceTimersByTime(900);
      });

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('100ms');
    });
  });

  describe('duration formatting', () => {
    it('formats milliseconds correctly', () => {
      render(
        <TestProviders>
          <LiveTimer initialTimeMs={500} isRunning={false} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('500ms');
    });

    it('formats seconds correctly', () => {
      render(
        <TestProviders>
          <LiveTimer initialTimeMs={2500} isRunning={false} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('2s');
    });

    it('formats minutes correctly', () => {
      render(
        <TestProviders>
          <LiveTimer initialTimeMs={125000} isRunning={false} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('2m 5s');
    });

    it('formats hours correctly', () => {
      render(
        <TestProviders>
          <LiveTimer initialTimeMs={3665000} isRunning={false} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('1h 1m 5s');
    });
  });

  describe('render prop', () => {
    it('calls render prop with formattedDuration and liveTimeMs', () => {
      const renderFn = jest.fn(({ formattedDuration, liveTimeMs }: LiveTimerRenderProps) => (
        <span data-test-subj="customRender">
          {formattedDuration} {'('}
          {liveTimeMs}
          {'ms)'}
        </span>
      ));

      render(
        <TestProviders>
          <LiveTimer initialTimeMs={1500} isRunning={false} render={renderFn} />
        </TestProviders>
      );

      expect(renderFn).toHaveBeenCalledWith({
        formattedDuration: '1s',
        liveTimeMs: 1500,
      });
      expect(screen.getByTestId('customRender')).toHaveTextContent('1s (1500ms)');
    });

    it('updates render prop with new values when running', () => {
      const renderFn = jest.fn(({ liveTimeMs }: LiveTimerRenderProps) => (
        <span data-test-subj="customRender">
          {liveTimeMs}
          {'ms'}
        </span>
      ));

      nowMs = 0;

      render(
        <TestProviders>
          <LiveTimer initialTimeMs={500} isRunning={true} render={renderFn} />
        </TestProviders>
      );

      expect(screen.getByTestId('customRender')).toHaveTextContent('500ms');

      act(() => {
        nowMs = 100;
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('customRender')).toHaveTextContent('600ms');
    });

    it('returns null from render prop when appropriate', () => {
      const renderFn = jest.fn(() => null);

      const { container } = render(
        <TestProviders>
          <LiveTimer initialTimeMs={500} isRunning={false} render={renderFn} />
        </TestProviders>
      );

      expect(renderFn).toHaveBeenCalled();
      expect(container.children.length).toBe(0);
    });
  });

  describe('EuiText props forwarding', () => {
    it('renders with size prop without error', () => {
      // Verifies that EuiText receives and accepts the size prop
      const { container } = render(
        <TestProviders>
          <LiveTimer initialTimeMs={500} isRunning={false} size="xs" />
        </TestProviders>
      );

      // The component should render successfully with the size prop
      expect(screen.getByTestId('liveTimer')).toBeInTheDocument();
      // Verify it renders as a text element (className contains 'euiText')
      expect(container.querySelector('.euiText')).toBeInTheDocument();
    });

    it('renders with color prop without error', () => {
      // Verifies that EuiText receives and accepts the color prop
      const { container } = render(
        <TestProviders>
          <LiveTimer color="subdued" initialTimeMs={500} isRunning={false} />
        </TestProviders>
      );

      // The component should render successfully with the color prop
      expect(screen.getByTestId('liveTimer')).toBeInTheDocument();
      // Verify it renders as a text element (className contains 'euiText')
      expect(container.querySelector('.euiText')).toBeInTheDocument();
    });
  });

  describe('startedAt prop', () => {
    it('calculates elapsed time from startedAt timestamp', () => {
      // Current time is 5000ms, startedAt was at 2000ms (3 seconds ago)
      nowMs = 5000;
      const startedAt = new Date(2000).toISOString();

      render(
        <TestProviders>
          <LiveTimer isRunning={false} startedAt={startedAt} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('3s');
    });

    it('updates timer correctly when running with startedAt', () => {
      nowMs = 5000;
      const startedAt = new Date(2000).toISOString(); // 3 seconds ago

      render(
        <TestProviders>
          <LiveTimer isRunning={true} startedAt={startedAt} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('3s');

      // Advance time by 2 seconds
      act(() => {
        nowMs = 7000;
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('5s');
    });

    it('does not reset timer on re-render when using startedAt', () => {
      nowMs = 5000;
      const startedAt = new Date(2000).toISOString(); // 3 seconds ago

      const { rerender } = render(
        <TestProviders>
          <LiveTimer isRunning={true} startedAt={startedAt} />
        </TestProviders>
      );

      expect(screen.getByTestId('liveTimer')).toHaveTextContent('3s');

      // Simulate parent re-render (e.g., from polling) - same props
      act(() => {
        nowMs = 7000;
        jest.advanceTimersByTime(2000);
      });

      rerender(
        <TestProviders>
          <LiveTimer isRunning={true} startedAt={startedAt} />
        </TestProviders>
      );

      // Timer should continue counting, not reset
      expect(screen.getByTestId('liveTimer')).toHaveTextContent('5s');
    });

    it('returns 0 elapsed time for empty startedAt', () => {
      nowMs = 5000;

      const { container } = render(
        <TestProviders>
          <LiveTimer isRunning={false} startedAt="" />
        </TestProviders>
      );

      // Empty string results in 0ms, which returns null
      expect(container.querySelector('[data-test-subj="liveTimer"]')).not.toBeInTheDocument();
    });

    it('returns 0 elapsed time for invalid startedAt', () => {
      nowMs = 5000;

      const { container } = render(
        <TestProviders>
          <LiveTimer isRunning={false} startedAt="invalid-date" />
        </TestProviders>
      );

      // Invalid date results in 0ms, which returns null
      expect(container.querySelector('[data-test-subj="liveTimer"]')).not.toBeInTheDocument();
    });

    it('returns 0 elapsed time for future startedAt (clock skew)', () => {
      nowMs = 5000;
      const futureStartedAt = new Date(10000).toISOString(); // 5 seconds in future

      const { container } = render(
        <TestProviders>
          <LiveTimer isRunning={false} startedAt={futureStartedAt} />
        </TestProviders>
      );

      // Future date results in 0ms due to Math.max(0, negative)
      expect(container.querySelector('[data-test-subj="liveTimer"]')).not.toBeInTheDocument();
    });

    it('prefers startedAt over initialTimeMs when both are provided', () => {
      nowMs = 5000;
      const startedAt = new Date(2000).toISOString(); // 3 seconds ago

      render(
        <TestProviders>
          <LiveTimer initialTimeMs={10000} isRunning={false} startedAt={startedAt} />
        </TestProviders>
      );

      // Should show 3s (from startedAt), not 10s (from initialTimeMs)
      expect(screen.getByTestId('liveTimer')).toHaveTextContent('3s');
    });
  });
});
