/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDateFormat, useTimeZone } from '../../../common/lib/kibana';
import { TimelineTimestamp } from './timeline_timestamp';

jest.mock('../../../common/lib/kibana');

beforeEach(() => {
  (useDateFormat as jest.Mock).mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS');
  (useTimeZone as jest.Mock).mockReturnValue('UTC');
});

describe('TimelineTimestamp', () => {
  it('formats to the second in the user time zone and ignores the millisecond default format', () => {
    (useTimeZone as jest.Mock).mockReturnValue('America/New_York');

    render(<TimelineTimestamp value="2026-10-14T17:06:02.000Z" data-test-subj="ts" />);

    expect(screen.getByTestId('ts')).toHaveTextContent('Oct 14, 2026 @ 13:06:02');
  });

  it('shows the raw value on hover', async () => {
    render(<TimelineTimestamp value="2026-10-14T17:06:02.000Z" data-test-subj="ts" />);

    await userEvent.hover(screen.getByTestId('ts'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('2026-10-14T17:06:02.000Z');
  });

  it('renders without a focusable tooltip anchor when raw-on-hover is off', async () => {
    render(
      <TimelineTimestamp
        value="2026-10-14T17:06:02.000Z"
        showRawOnHover={false}
        data-test-subj="ts"
      />
    );

    const timestamp = screen.getByTestId('ts');
    expect(timestamp).toHaveTextContent('Oct 14, 2026 @ 17:06:02');
    expect(timestamp).not.toHaveAttribute('tabindex');

    await userEvent.hover(timestamp);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('falls back to the raw value when it is not a date', () => {
    render(<TimelineTimestamp value="unknown" data-test-subj="ts" />);

    expect(screen.getByTestId('ts')).toHaveTextContent('unknown');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
