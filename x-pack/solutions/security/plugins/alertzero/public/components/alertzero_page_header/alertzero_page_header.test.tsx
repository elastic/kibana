/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { useKibanaTimeZone } from '../../hooks/use_kibana_time_zone';
import { AlertZeroPageHeader } from './alertzero_page_header';
import type { AlertZeroPageHeaderProps } from './alertzero_page_header';

jest.mock('../../hooks/use_kibana_time_zone');

(useKibanaTimeZone as jest.Mock).mockReturnValue('UTC');

const setup = (props: AlertZeroPageHeaderProps = {}) =>
  render(
    <EuiProvider>
      <AlertZeroPageHeader {...props} />
    </EuiProvider>
  );

const heading = () => screen.getByRole('heading', { level: 1 }).textContent ?? '';

describe('AlertZeroPageHeader', () => {
  it('should render the pending action count', () => {
    setup({ eventCount: 3 });

    expect(heading()).toContain('3 actions need you');
  });

  it('should render the singular form for a single action', () => {
    setup({ eventCount: 1 });

    expect(heading()).toContain('1 action needs you');
  });

  it('should say the queue is clear only when it has a count to back it up', () => {
    setup({ eventCount: 0 });

    expect(heading()).toContain("You're all caught up");
  });

  /**
   * A failed count arrives as zero, which is indistinguishable from "nothing to
   * do" — so an all-clear over a queue that is not clear is the one thing this
   * header must never say.
   */
  it('should not claim an all-clear when the count could not be fetched', () => {
    setup({ eventCount: 0, hasError: true });

    expect(heading()).toContain("Your action count couldn't be loaded");
    expect(heading()).not.toContain("You're all caught up");
  });

  it('should not report an empty queue when the count could not be fetched', () => {
    setup({ eventCount: 0, hasError: true, isQueueEmpty: true });

    expect(heading()).not.toContain('No events found');
  });

  it('should stay in its loading state until every query it speaks for settles', () => {
    setup({ isLoading: true, isQueueEmpty: true, eventCount: 0 });

    expect(heading()).toContain('Looking into your data...');
  });

  /**
   * The greeting reads the hour out of `Intl`, whose 0–23 output is not a given:
   * `hour12: false` resolved to the 1–24 cycle for `en-US` on engines shipped
   * before 2024, which turned midnight into `"24"` and greeted the small hours
   * with "Good evening". The boundaries are asserted against a fixed clock so a
   * future change to the formatter options can't quietly reintroduce that.
   */
  describe('greeting', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    const greetingAtUtcHour = (hour: number, minute = 0) => {
      jest.useFakeTimers().setSystemTime(Date.UTC(2026, 8, 14, hour, minute));
      setup({ eventCount: 1 });
      return heading();
    };

    it.each([
      [0, 'Good morning!'],
      [11, 'Good morning!'],
      [12, 'Good afternoon!'],
      [17, 'Good afternoon!'],
      [18, 'Good evening!'],
      [23, 'Good evening!'],
    ])('should greet %i:00 UTC with "%s"', (hour, expected) => {
      expect(greetingAtUtcHour(hour)).toContain(expected);
    });

    it('should not treat midnight as the end of the day', () => {
      expect(greetingAtUtcHour(0, 30)).not.toContain('Good evening!');
    });

    /**
     * The boundaries above cannot catch a revert to `hour12: false`, because the
     * engine this suite runs on resolves both spellings to `h23`. Asserting the
     * options themselves is what pins the fix on every engine.
     */
    it('should ask Intl for the 0-23 cycle by name rather than via hour12', () => {
      const spy = jest.spyOn(Intl, 'DateTimeFormat');
      setup({ eventCount: 1 });

      const options = spy.mock.calls.map(([, opts]) => opts).filter((opts) => opts?.hour);
      expect(options).not.toHaveLength(0);
      options.forEach((opts) => {
        expect(opts).toMatchObject({ hourCycle: 'h23' });
        expect(opts).not.toHaveProperty('hour12');
      });

      spy.mockRestore();
    });
  });
});
