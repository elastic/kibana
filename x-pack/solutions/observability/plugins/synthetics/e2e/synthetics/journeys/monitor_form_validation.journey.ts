/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect, journey, Page, step } from '@elastic/synthetics';
import { FormMonitorType } from '@kbn/synthetics-plugin/common/runtime_types';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';
import {
  isEuiFormFieldInValid,
  clearAndType,
  typeViaKeyboard,
  clickAndBlur,
  assertShouldNotExist,
} from '../page_objects/utils';

const customLocation = process.env.SYNTHETICS_TEST_LOCATION;

const basicMonitorDetails = {
  location: customLocation || 'US Central',
  schedule: '3',
};
const existingMonitorName = 'https://amazon.com';

const apmServiceName = 'apmServiceName';

type ValidationAssertionAction =
  | 'focus'
  | 'click'
  | 'assertExists'
  | 'assertDoesNotExist'
  | 'assertEuiFormFieldInValid'
  | 'assertEuiFormFieldValid'
  | 'clearAndType'
  | 'typeViaKeyboard'
  | 'clickAndBlur'
  | 'waitForTimeout'
  | 'selectMonitorFrequency';

interface ValidationAssertionInstruction {
  action: ValidationAssertionAction;
  selector?: string;
  arg?: string | number | object;
}

const configuration: Record<
  FormMonitorType,
  { monitorType: FormMonitorType; validationInstructions: ValidationAssertionInstruction[] }
> = {
  [FormMonitorType.MULTISTEP]: {
    monitorType: FormMonitorType.MULTISTEP,
    validationInstructions: [
      // Select monitor type
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorTypeMultistep]' },

      // 'required' field assertions
      { action: 'focus', selector: '[data-test-subj=syntheticsMonitorConfigName]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigLocations]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigName]' },
      { action: 'assertExists', selector: 'text=Monitor name is required' },
      {
        action: 'assertEuiFormFieldInValid',
        selector: '[data-test-subj=syntheticsMonitorConfigLocations]',
      },

      // Name duplication assertion
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigName]',
        arg: existingMonitorName,
      },
      { action: 'assertExists', selector: 'text=Monitor name already exists' },

      // Mmonitor script
      { action: 'click', selector: '[data-test-subj=syntheticsSourceTab__inline]' },
      { action: 'click', selector: '[aria-labelledby=syntheticsBrowserInlineConfig]' },
      {
        action: 'typeViaKeyboard',
        selector: '[aria-labelledby=syntheticsBrowserInlineConfig]',
        arg: '}',
      },
      {
        action: 'assertExists',
        selector:
          'text=Monitor script is invalid. Inline scripts must contain at least one step definition.',
      },
      {
        action: 'click',
        selector: '[data-test-subj=syntheticsMonitorConfigSubmitButton]',
      },
      { action: 'assertExists', selector: 'text=Please address the highlighted errors.' },
    ],
  },
  [FormMonitorType.SINGLE]: {
    monitorType: FormMonitorType.SINGLE,
    validationInstructions: [
      // Select monitor type
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorTypeSingle]' },

      // Name duplication assertion
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigName]',
        arg: existingMonitorName,
      },
      {
        action: 'click',
        selector: '[data-test-subj=syntheticsMonitorConfigSubmitButton]',
      },
      { action: 'assertExists', selector: 'text=Monitor name already exists' },
      { action: 'assertExists', selector: 'text=Please address the highlighted errors.' },
    ],
  },
  [FormMonitorType.HTTP]: {
    monitorType: FormMonitorType.HTTP,
    validationInstructions: [
      // Select monitor type
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorTypeHTTP]' },

      // 'required' field assertions
      { action: 'focus', selector: '[data-test-subj=syntheticsMonitorConfigName]' },
      { action: 'focus', selector: '[data-test-subj=syntheticsMonitorConfigURL]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigLocations]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigMaxRedirects]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigName]' },
      { action: 'assertExists', selector: 'text=Monitor name is required' },
      {
        action: 'assertEuiFormFieldInValid',
        selector: '[data-test-subj=syntheticsMonitorConfigLocations]',
      },

      // Monitor max redirects
      {
        action: 'assertEuiFormFieldValid',
        selector: '[data-test-subj=syntheticsMonitorConfigMaxRedirects]',
      },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigMaxRedirects]',
        arg: '11',
      },
      {
        action: 'assertEuiFormFieldInValid',
        selector: '[data-test-subj=syntheticsMonitorConfigMaxRedirects]',
      },
      { action: 'assertExists', selector: 'text=Max redirects is invalid.' },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigMaxRedirects]',
        arg: '3',
      },
      { action: 'clickAndBlur', selector: '[data-test-subj=syntheticsMonitorConfigMaxRedirects]' },
      { action: 'assertDoesNotExist', selector: 'text=Max redirects is invalid.' },

      // Monitor timeout
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigTimeout]',
        arg: '-1',
      },
      { action: 'assertExists', selector: 'text=Timeout must be greater than or equal to 0.' },
      { action: 'selectMonitorFrequency', selector: undefined, arg: { value: 1, unit: 'minute' } },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigTimeout]',
        arg: '61',
      },
      { action: 'assertExists', selector: 'text=Timeout must be less than the monitor frequency.' },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigTimeout]',
        arg: '60',
      },
      {
        action: 'assertDoesNotExist',
        selector: 'text=Timeout must be less than the monitor frequency.',
      },

      // Name duplication assertion
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigName]',
        arg: existingMonitorName,
      },
      { action: 'assertExists', selector: 'text=Monitor name already exists' },

      // Advanced Settings
      { action: 'click', selector: 'text=Advanced options' },
      { action: 'click', selector: '[data-test-subj=syntheticsHeaderFieldRequestHeaders__button]' },
      { action: 'assertExists', selector: '[data-test-subj=keyValuePairsKey0]' },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=keyValuePairsKey0]',
        arg: 'K e',
      },
      { action: 'clickAndBlur', selector: '[data-test-subj=keyValuePairsKey0]' },
      { action: 'assertExists', selector: 'text=Header key must be a valid HTTP token.' },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=keyValuePairsKey0]',
        arg: 'X-Api-Key',
      },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=keyValuePairsValue0]',
        arg: 'V a l u e',
      },
      {
        action: 'assertDoesNotExist',
        selector: 'text=Header key must be a valid HTTP token.',
      },
    ],
  },
  [FormMonitorType.TCP]: {
    monitorType: FormMonitorType.TCP,
    validationInstructions: [
      // Select monitor type
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorTypeTCP]' },

      // 'required' field assertions
      { action: 'focus', selector: '[data-test-subj=syntheticsMonitorConfigName]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigHost]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigLocations]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigName]' },

      // Enter a duplicate name
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigName]',
        arg: existingMonitorName,
      },
      { action: 'assertExists', selector: 'text=Monitor name already exists' },

      // Clear name
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigName]',
        arg: '',
      },
      { action: 'assertExists', selector: 'text=Monitor name is required' },
      {
        action: 'assertEuiFormFieldInValid',
        selector: '[data-test-subj=syntheticsMonitorConfigLocations]',
      },
      {
        action: 'assertEuiFormFieldInValid',
        selector: '[data-test-subj=syntheticsMonitorConfigHost]',
      },

      // Monitor timeout
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigTimeout]',
        arg: '-1',
      },
      { action: 'assertExists', selector: 'text=Timeout must be greater than or equal to 0.' },
      { action: 'selectMonitorFrequency', selector: undefined, arg: { value: 1, unit: 'minute' } },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigTimeout]',
        arg: '61',
      },
      { action: 'assertExists', selector: 'text=Timeout must be less than the monitor frequency.' },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigTimeout]',
        arg: '60',
      },
      {
        action: 'assertDoesNotExist',
        selector: 'text=Timeout must be less than the monitor frequency.',
      },

      // Submit form
      {
        action: 'click',
        selector: '[data-test-subj=syntheticsMonitorConfigSubmitButton]',
      },
      { action: 'assertExists', selector: 'text=Please address the highlighted errors.' },
    ],
  },
  [FormMonitorType.ICMP]: {
    monitorType: FormMonitorType.ICMP,
    validationInstructions: [
      // Select monitor type
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorTypeICMP]' },

      // 'required' field assertions
      { action: 'focus', selector: '[data-test-subj=syntheticsMonitorConfigName]' },
      { action: 'focus', selector: '[data-test-subj=syntheticsMonitorConfigHost]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigLocations]' },
      { action: 'click', selector: '[data-test-subj=syntheticsMonitorConfigName]' },

      // Enter a duplicate name
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigName]',
        arg: existingMonitorName,
      },
      { action: 'assertExists', selector: 'text=Monitor name already exists' },

      // Clear name
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigName]',
        arg: '',
      },
      { action: 'assertExists', selector: 'text=Monitor name is required' },
      {
        action: 'assertEuiFormFieldInValid',
        selector: '[data-test-subj=syntheticsMonitorConfigLocations]',
      },
      {
        action: 'assertEuiFormFieldInValid',
        selector: '[data-test-subj=syntheticsMonitorConfigHost]',
      },

      // Monitor timeout
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigTimeout]',
        arg: '-1',
      },
      { action: 'assertExists', selector: 'text=Timeout must be greater than or equal to 0.' },
      { action: 'selectMonitorFrequency', selector: undefined, arg: { value: 1, unit: 'minute' } },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigTimeout]',
        arg: '61',
      },
      { action: 'assertExists', selector: 'text=Timeout must be less than the monitor frequency.' },
      {
        action: 'clearAndType',
        selector: '[data-test-subj=syntheticsMonitorConfigTimeout]',
        arg: '60',
      },
      {
        action: 'assertDoesNotExist',
        selector: 'text=Timeout must be less than the monitor frequency.',
      },

      // Submit form
      {
        action: 'click',
        selector: '[data-test-subj=syntheticsMonitorConfigSubmitButton]',
      },
      { action: 'assertExists', selector: 'text=Please address the highlighted errors.' },
    ],
  },
};

const exitingMonitorConfig = {
  ...basicMonitorDetails,
  name: existingMonitorName,
  url: existingMonitorName,
  locations: [basicMonitorDetails.location],
  apmServiceName,
};

journey(
  `SyntheticsAddMonitor - Validation Test`,
  async ({ page, params }: { page: Page; params: any }) => {
    const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });

    step('Go to monitor management', async () => {
      await syntheticsApp.navigateToMonitorManagement(true);
      await syntheticsApp.enableMonitorManagement();
    });

    step('Ensure all monitors are deleted', async () => {
      await syntheticsApp.waitForLoadingToFinish();
      const isSuccessful = await syntheticsApp.deleteMonitors();
      expect(isSuccessful).toBeTruthy();
    });

    step('Create a monitor to validate duplicate name', async () => {
      await syntheticsApp.navigateToAddMonitor();
      await syntheticsApp.ensureIsOnMonitorConfigPage();
      await syntheticsApp.createMonitor({
        monitorConfig: exitingMonitorConfig,
        monitorType: FormMonitorType.HTTP,
      });
      const isSuccessful = await syntheticsApp.confirmAndSave();
      expect(isSuccessful).toBeTruthy();
    });

    step(`Goto Add Monitor page`, async () => {
      await syntheticsApp.navigateToAddMonitor();
      await syntheticsApp.ensureIsOnMonitorConfigPage();
    });

    Object.values(configuration).forEach((config) => {
      const { monitorType, validationInstructions } = config;

      step(`Test form validation for monitor type [${monitorType}]`, async () => {
        for (const instruction of validationInstructions) {
          const { action, selector, arg } = instruction;
          const locator = page.locator(selector ?? '');
          switch (action) {
            case 'focus':
              await locator.focus();
              break;
            case 'click':
              await locator.click();
              break;
            case 'assertExists':
              await locator.waitFor();
              break;
            case 'assertDoesNotExist':
              await assertShouldNotExist(locator);
              break;
            case 'assertEuiFormFieldInValid':
              expect(await isEuiFormFieldInValid(locator)).toEqual(true);
              break;
            case 'assertEuiFormFieldValid':
              expect(await isEuiFormFieldInValid(locator)).toEqual(false);
              break;
            case 'clearAndType':
              await clearAndType(locator, arg as string);
              break;
            case 'typeViaKeyboard':
              await typeViaKeyboard(locator, arg as string);
              break;
            case 'clickAndBlur':
              await clickAndBlur(locator);
              break;
            case 'waitForTimeout':
              await page.waitForTimeout(arg as number);
              break;
            case 'selectMonitorFrequency':
              await syntheticsApp.selectFrequencyAddEdit(arg as { value: number; unit: 'minute' });
              break;
            default:
              throw Error(
                `Assertion Instruction ${JSON.stringify(instruction)} is not recognizable`
              );
          }
        }
      });
    });
  }
);
