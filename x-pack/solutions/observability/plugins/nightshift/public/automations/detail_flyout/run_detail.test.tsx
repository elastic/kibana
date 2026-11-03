/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RunDetail } from './run_detail';
import type { Run } from './run_history';

// The kind of value that broke the layout: a Discover link in a posted alert, with no spaces.
const LONG_URL = `http://localhost:5765/remote/app/r?l=DISCOVER_APP_LOCATOR&v=9.7.0&lz=${'N4Igjg'.repeat(
  150
)}`;

const run = (overrides: Partial<Run> = {}): Run => ({
  id: 'run-1',
  status: 'succeeded',
  startedAt: '2026-11-02T23:26:00.000Z',
  finishedAt: '2026-11-02T23:26:05.000Z',
  triggeredBy: 'inboundWebhook.received',
  title: 'Disk almost full on web-1',
  message: `Investigate this alert.\n\nPayload: {"name":"Disk almost full","link":"${LONG_URL}"}`,
  ...overrides,
});

const renderDetail = (value: Run) =>
  render(
    <I18nProvider>
      <RunDetail
        run={value}
        automationName="Remote 1 Alerts"
        titleId="run-title"
        headerCss={css``}
        bodyCss={css``}
      />
    </I18nProvider>
  );

describe('RunDetail', () => {
  it('keeps the labels readable when the message holds a long unbroken value', () => {
    renderDetail(run());
    const list = document.querySelector('.euiDescriptionList');
    // The value column must be able to shrink. With `1fr` its minimum is the width of the longest
    // unbreakable value, so the column outgrows the flyout and the labels collapse.
    expect(list).toHaveStyle({ gridTemplateColumns: 'auto minmax(0, 1fr)' });
    for (const label of ['Source', 'Message', 'Started', 'Ended', 'Automation']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('lets a long value break inside the message', () => {
    renderDetail(run());
    const message = screen.getByText(/Investigate this alert/);
    expect(message.textContent).toContain(LONG_URL);
    expect(message).toHaveStyle({ overflowWrap: 'anywhere' });
  });

  it('does the same for a skipped run', () => {
    renderDetail(run({ status: 'skipped', skipReason: 'daily_limit', dailyLimit: 20 }));
    expect(document.querySelector('.euiDescriptionList')).toHaveStyle({
      gridTemplateColumns: 'auto minmax(0, 1fr)',
    });
  });
});
