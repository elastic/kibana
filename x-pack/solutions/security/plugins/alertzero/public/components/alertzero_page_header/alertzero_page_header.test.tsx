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
});
