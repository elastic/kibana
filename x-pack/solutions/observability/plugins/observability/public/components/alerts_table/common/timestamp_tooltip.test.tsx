/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import moment from 'moment-timezone';
import { TimestampTooltip } from './timestamp_tooltip';

function mockNow(date: string | number | Date) {
  const fakeNow = new Date(date).getTime();
  return jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
}

describe('TimestampTooltip', () => {
  const timestamp = 1570720000123; // Oct 10, 2019, 08:06:40.123 (UTC-7)

  beforeAll(() => {
    // mock Date.now
    mockNow(1570737000000);

    moment.tz.setDefault('America/Los_Angeles');
  });

  afterAll(() => moment.tz.setDefault(''));

  it('should render component with absolute time in body and absolute time in tooltip', async () => {
    const { getByRole, getByText } = render(<TimestampTooltip time={timestamp} />);

    const expectedDateString = 'Oct 10, 2019, 08:06:40.123 (UTC-7)';

    const anchor = getByText(expectedDateString);

    fireEvent.mouseOver(anchor);

    await waitFor(() => {
      const tooltip = getByRole('tooltip');
      expect(tooltip.textContent).toBe(expectedDateString);
    });
  });

  it('should format with precision in seconds', async () => {
    const { getByRole, getByText } = render(
      <TimestampTooltip time={timestamp} timeUnit="seconds" />
    );

    const expectedDateString = 'Oct 10, 2019, 08:06:40 (UTC-7)';

    const anchor = getByText(expectedDateString);

    fireEvent.mouseOver(anchor);

    await waitFor(() => {
      const tooltip = getByRole('tooltip');
      expect(tooltip.textContent).toBe(expectedDateString);
    });
  });

  it('should format with precision in minutes', async () => {
    const { getByRole, getByText } = render(
      <TimestampTooltip time={timestamp} timeUnit="minutes" />
    );

    const expectedDateString = 'Oct 10, 2019, 08:06 (UTC-7)';

    const anchor = getByText(expectedDateString);

    fireEvent.mouseOver(anchor);

    await waitFor(() => {
      const tooltip = getByRole('tooltip');
      expect(tooltip.textContent).toBe(expectedDateString);
    });
  });
});
