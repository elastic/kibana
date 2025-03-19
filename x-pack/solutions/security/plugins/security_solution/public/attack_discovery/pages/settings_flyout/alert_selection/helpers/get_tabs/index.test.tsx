/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTabs } from '.';
import { ALERTS_PREVIEW, ALERT_SUMMARY } from '../../translations';

const mockProps = {
  alertsPreviewStackBy0: 'mockAlertsPreviewStackBy0',
  alertSummaryStackBy0: 'mockAlertSummaryStackBy0',
  end: 'now',
  filters: [],
  maxAlerts: 100,
  query: { query: '', language: 'kuery' },
  setAlertsPreviewStackBy0: jest.fn(),
  setAlertSummaryStackBy0: jest.fn(),
  start: 'now-7',
};

describe('getTabs', () => {
  it('returns the alert summary tab with the expected name', () => {
    const tabs = getTabs(mockProps);

    expect(tabs[0].name).toBe(ALERT_SUMMARY);
  });

  it('returns the alerts preview tab with the expected name', () => {
    const tabs = getTabs(mockProps);

    expect(tabs[1].name).toBe(ALERTS_PREVIEW);
  });
});
