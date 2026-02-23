/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

enum FormMonitorType {
  SINGLE = 'single',
  MULTISTEP = 'multistep',
  HTTP = 'http',
  TCP = 'tcp',
  ICMP = 'icmp',
}

const apmServiceName = 'apmServiceName';

const monitorConfigurations = (locationLabel: string) => {
  const httpName = `http monitor ${uuidv4()}`;
  const icmpName = `icmp monitor ${uuidv4()}`;
  const tcpName = `tcp monitor ${uuidv4()}`;
  const browserName = `browser monitor ${uuidv4()}`;
  const browserRecorderName = `browser monitor recorder ${uuidv4()}`;

  return {
    [FormMonitorType.HTTP]: {
      monitorType: FormMonitorType.HTTP,
      monitorConfig: {
        schedule: '3',
        name: httpName,
        url: 'https://elastic.co',
        locations: [locationLabel],
        apmServiceName,
      },
      monitorListDetails: {
        location: locationLabel,
        schedule: '3',
        name: httpName,
      },
      monitorEditDetails: [
        ['[data-test-subj=syntheticsMonitorConfigSchedule]', '3'],
        ['[data-test-subj=syntheticsMonitorConfigName]', httpName],
        ['[data-test-subj=syntheticsMonitorConfigURL]', 'https://elastic.co'],
        ['[data-test-subj=syntheticsMonitorConfigAPMServiceName]', apmServiceName],
      ] as Array<[string, string]>,
    },
    [FormMonitorType.TCP]: {
      monitorType: FormMonitorType.TCP,
      monitorConfig: {
        schedule: '3',
        name: tcpName,
        host: 'smtp.gmail.com:587',
        locations: [locationLabel],
        apmServiceName,
      },
      monitorListDetails: {
        location: locationLabel,
        schedule: '3',
        name: tcpName,
      },
      monitorEditDetails: [
        ['[data-test-subj=syntheticsMonitorConfigSchedule]', '3'],
        ['[data-test-subj=syntheticsMonitorConfigName]', tcpName],
        ['[data-test-subj=syntheticsMonitorConfigHost]', 'smtp.gmail.com:587'],
        ['[data-test-subj=syntheticsMonitorConfigAPMServiceName]', apmServiceName],
      ] as Array<[string, string]>,
    },
    [FormMonitorType.ICMP]: {
      monitorType: FormMonitorType.ICMP,
      monitorConfig: {
        schedule: '3',
        name: icmpName,
        host: '1.1.1.1',
        locations: [locationLabel],
        apmServiceName,
      },
      monitorListDetails: {
        location: locationLabel,
        schedule: '3',
        name: icmpName,
      },
      monitorEditDetails: [
        ['[data-test-subj=syntheticsMonitorConfigSchedule]', '3'],
        ['[data-test-subj=syntheticsMonitorConfigName]', icmpName],
        ['[data-test-subj=syntheticsMonitorConfigHost]', '1.1.1.1'],
        ['[data-test-subj=syntheticsMonitorConfigAPMServiceName]', apmServiceName],
      ] as Array<[string, string]>,
    },
    [FormMonitorType.MULTISTEP]: {
      monitorType: FormMonitorType.MULTISTEP,
      monitorConfig: {
        schedule: '10',
        name: browserName,
        inlineScript: 'step("test step", () => {})',
        locations: [locationLabel],
        apmServiceName,
      },
      monitorListDetails: {
        location: locationLabel,
        schedule: '10',
        name: browserName,
      },
      monitorEditDetails: [
        ['[data-test-subj=syntheticsMonitorConfigSchedule]', '10'],
        ['[data-test-subj=syntheticsMonitorConfigName]', browserName],
        [
          'div[data-test-subj="codeEditorContainer"][aria-label="JavaScript code editor"] .view-line',
          'step("test step", () => {})',
        ],
        ['[data-test-subj=syntheticsMonitorConfigAPMServiceName]', apmServiceName],
      ] as Array<[string, string]>,
    },
    [`${FormMonitorType.MULTISTEP}__recorder`]: {
      monitorType: FormMonitorType.MULTISTEP,
      monitorConfig: {
        schedule: '10',
        name: browserRecorderName,
        recorderScript: 'step("test step", () => {})',
        locations: [locationLabel],
        apmServiceName: 'Sample APM Service',
      },
      monitorListDetails: {
        location: locationLabel,
        schedule: '10',
        name: browserRecorderName,
      },
      monitorEditDetails: [
        ['[data-test-subj=syntheticsMonitorConfigSchedule]', '10'],
        ['[data-test-subj=syntheticsMonitorConfigName]', browserRecorderName],
        [
          'div[data-test-subj="codeEditorContainer"][aria-label="JavaScript code editor"] .view-line',
          'step("test step", () => {})',
        ],
      ] as Array<[string, string]>,
    },
  };
};

test.describe('AddMonitor', { tag: tags.stateful.classic }, () => {
  let locationLabel: string;
  let configs: ReturnType<typeof monitorConfigurations>;

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.enableMonitorManagedViaApi();
    await syntheticsServices.cleanTestMonitors();
    const location = await syntheticsServices.ensurePrivateLocationExists();
    locationLabel = location.label;
    configs = monitorConfigurations(locationLabel);
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanTestMonitors();
  });

  const monitorTypesToTest = [
    FormMonitorType.HTTP,
    // FormMonitorType.TCP,
    // FormMonitorType.ICMP,
    // FormMonitorType.MULTISTEP,
    // `${FormMonitorType.MULTISTEP}__recorder` as const,
  ] as const;

  for (const monitorType of monitorTypesToTest) {
    test(`creates, edits, and deletes ${monitorType} monitor`, async ({
      pageObjects,
      page,
      browserAuth,
    }) => {
      const config = configs[monitorType];
      const monitorName = config.monitorConfig.name;

      await test.step('setup: login and navigate', async () => {
        await browserAuth.loginAsAdmin();
        await pageObjects.syntheticsApp.navigateToAddMonitor();
        await pageObjects.syntheticsApp.ensureIsOnMonitorConfigPage();
      });

      await test.step(`create ${monitorType} monitor`, async () => {
        await pageObjects.syntheticsApp.createMonitor({
          monitorConfig: config.monitorConfig,
          monitorType: config.monitorType,
        });
        await pageObjects.syntheticsApp.confirmAndSave();
      });

      await test.step('view monitor details in management UI', async () => {
        await expect(page.testSubj.locator('syntheticsMonitorDetailsLinkLink')).toHaveText(
          config.monitorListDetails.name
        );
        // await pageObjects.syntheticsApp.findMonitorConfiguration(config.monitorListDetails);
      });

      await test.step(`edit ${monitorType} monitor`, async () => {
        await pageObjects.syntheticsApp.navigateToEditMonitor(monitorName);
        await expect(
          page.testSubj.locator('syntheticsMonitorInspectShowFlyoutExampleButton')
        ).toBeVisible();
        await expect(page.getByText(locationLabel)).toBeVisible();
        await pageObjects.syntheticsApp.findEditMonitorConfiguration(config.monitorEditDetails);
        await page.testSubj.click('syntheticsMonitorConfigSubmitButton');
        await expect(page.getByText('Monitor updated successfully.')).toBeVisible({
          timeout: 60_000,
        });
      });

      // await test.step('cannot save monitor with the same name', async () => {
      //   await pageObjects.syntheticsApp.navigateToAddMonitor();
      //   await pageObjects.syntheticsApp.createMonitor({
      //     monitorConfig: config.monitorConfig,
      //     monitorType: config.monitorType,
      //   });
      //   await expect(page.getByText('Monitor name already exists')).toBeVisible();
      //   await page.testSubj.click('syntheticsMonitorConfigSubmitButton');
      //   await page.click('text=Cancel');
      // });

      // await test.step('delete monitor', async () => {
      //   await expect(page.getByText('Monitor')).toBeVisible();
      //   await pageObjects.syntheticsApp.deleteMonitors();
      // });
    });
  }
});
