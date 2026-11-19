/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMonitorDetailsAppHeaderTabs } from './get_monitor_details_app_header_tabs';

const getAlertsTab = (isReadOnly: boolean) =>
  getMonitorDetailsAppHeaderTabs({
    syntheticsPath: '',
    selectedTab: 'alerts',
    monitorId: 'm-1',
    search: '',
    isReadOnly,
    numberOfActiveAlerts: isReadOnly ? 0 : 2,
  }).find((tab) => tab['data-test-subj'] === 'syntheticsMonitorAlertsTab');

describe('getMonitorDetailsAppHeaderTabs - Alerts tab', () => {
  it('renders the Alerts tab as enabled with a count badge for local monitors', () => {
    const alertsTab = getAlertsTab(false);

    expect(alertsTab?.disabled).toBeFalsy();
    expect(alertsTab?.label).toBe('Alerts');
    expect(alertsTab?.href).toContain('/alerts');
    expect(alertsTab?.badge).toBe(2);
    expect(alertsTab?.toolTipContent).toBeUndefined();
  });

  it('disables the Alerts tab and shows a tooltip for read-only monitors', () => {
    const alertsTab = getAlertsTab(true);

    expect(alertsTab?.disabled).toBe(true);
    expect(alertsTab?.href).toBeUndefined();
    expect(alertsTab?.badge).toBeUndefined();
    expect(alertsTab?.toolTipContent).toBe('Alerts are not available for read-only monitors');
  });
});
