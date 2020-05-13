/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeOverviewProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async expandMonitorDetail(id: string): Promise<void> {
      return testSubjects.click(`xpack.uptime.monitorList.${id}.expandMonitorDetail`);
    },
    async openIntegrationsPopoverForMonitor(id: string): Promise<void> {
      return testSubjects.click(`xpack.uptime.monitorList.actionsPopover.${id}`);
    },
    async openAlertsPopover(): Promise<void> {
      return testSubjects.click('xpack.uptime.alertsPopover.toggleButton');
    },
    /**
     * If the popover is already open, click the nested button.
     * Otherwise, open the popover, then click the nested button.
     */
    async navigateToNestedPopover(): Promise<void> {
      if (testSubjects.exists('xpack.uptime.openAlertContextPanel')) {
        return testSubjects.click('xpack.uptime.openAlertContextPanel');
      }
      await testSubjects.click('xpack.uptime.alertsPopover.toggleButton');
      return testSubjects.click('xpack.uptime.openAlertContextPanel');
    },
  };
}
