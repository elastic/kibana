/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, cleanup, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/test-env/test/rtl';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { OperatingSystem, TrustedDeviceConditionEntryField } from '@kbn/securitysolution-utils';
import type {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
} from '../../../../components/artifact_list_page';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { forceHTMLElementOffsetWidth } from '../../../../components/effected_policy_select/test_utils';
import { OPERATING_SYSTEM_WINDOWS_AND_MAC, OS_TITLES } from '../../../../common/translations';
import { INPUT_ERRORS, CONDITION_FIELD_TITLE, OPERATOR_TITLES } from '../translations';
import { TrustedDevicesForm } from './form';
import { licenseService } from '../../../../../common/hooks/use_license';
import { useGetTrustedDeviceSuggestions } from '../../hooks/use_get_trusted_device_suggestions';

jest.mock('../../../../../common/components/user_privileges');
jest.mock('../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isEnterprise: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

jest.mock('../../hooks/use_get_trusted_device_suggestions');
jest.mock('../../../../../common/containers/source', () => ({
  useFetchIndex: jest.fn(),
}));

import { useFetchIndex } from '../../../../../common/containers/source';

describe('Trusted devices form', () => {
  jest.setTimeout(10000);

  const formPrefix = 'trustedDevices-form';
  let resetHTMLElementOffsetWidth: ReturnType<typeof forceHTMLElementOffsetWidth>;

  let formProps: jest.Mocked<ArtifactFormComponentProps>;
  let mockedContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let latestUpdatedItem: ArtifactFormComponentProps['item'];

  const getUI = () => <TrustedDevicesForm {...formProps} />;

  const render = async () => {
    renderResult = mockedContext.render(getUI());
    return renderResult;
  };

  const rerender = () => renderResult.rerender(getUI());

  const rerenderWithLatestProps = () => {
    formProps.item = latestUpdatedItem;
    rerender();
  };

  function createEntry(
    field: TrustedDeviceConditionEntryField,
    type: 'match' | 'wildcard',
    value: string
  ) {
    return {
      field,
      type,
      operator: 'included' as const,
      value,
    };
  }

  function createItem(
    overrides: Partial<ArtifactFormComponentProps['item']> = {}
  ): ArtifactFormComponentProps['item'] {
    const defaults: ArtifactFormComponentProps['item'] = {
      list_id: 'trusted-devices-list-id',
      name: '',
      description: '',
      // Use Windows-only OS for USERNAME field compatibility, or HOST field for other combinations
      os_types: [OperatingSystem.WINDOWS],
      entries: [createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', '')],
      type: 'simple',
      tags: ['policy:all'],
      meta: { temporaryUuid: 'td-1111' },
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  function createOnChangeArgs(
    overrides: Partial<ArtifactFormComponentOnChangeCallbackProps>
  ): ArtifactFormComponentOnChangeCallbackProps {
    const defaults: ArtifactFormComponentOnChangeCallbackProps = {
      item: createItem(),
      isValid: false,
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  // Helpers
  const setTextFieldValue = async (
    textField: HTMLInputElement | HTMLTextAreaElement,
    value: string
  ) => {
    if (textField.getAttribute('role') === 'combobox') {
      await userEvent.clear(textField);
      await userEvent.paste(value);
      await userEvent.keyboard('{Enter}');
    } else {
      // For regular text fields
      act(() => {
        fireEvent.change(textField, {
          target: { value },
        });
        fireEvent.blur(textField);
      });
    }
  };

  const getDetailsBlurb = (dataTestSub: string = formPrefix): HTMLInputElement | null => {
    return renderResult.queryByTestId(`${dataTestSub}-about`) as HTMLInputElement | null;
  };

  const getNameField = (dataTestSub: string = formPrefix): HTMLInputElement => {
    return renderResult.getByTestId(`${dataTestSub}-nameTextField`) as HTMLInputElement;
  };

  const getDescriptionField = (dataTestSub: string = formPrefix): HTMLTextAreaElement => {
    return renderResult.getByTestId(`${dataTestSub}-descriptionField`) as HTMLTextAreaElement;
  };

  const getOsCombo = (dataTestSub: string = formPrefix): HTMLElement => {
    return renderResult.getByTestId(`${dataTestSub}-osSelectField`);
  };

  const openOsCombo = async (dataTestSub: string = formPrefix) => {
    const combo = getOsCombo(dataTestSub);
    const toggle = within(combo).getByTestId('comboBoxToggleListButton');
    await userEvent.click(toggle);
    await waitForEuiPopoverOpen();
  };

  const getEntryFieldSelect = (index = 0): HTMLButtonElement =>
    renderResult.getByTestId(`${formPrefix}-entry${index}fieldSelect`) as HTMLButtonElement;

  const getEntryOperatorSelect = (index = 0): HTMLButtonElement =>
    renderResult.getByTestId(`${formPrefix}-entry${index}operatorSelect`) as HTMLButtonElement;

  const getEntryValueField = (index = 0): HTMLInputElement => {
    const comboBox = renderResult.getByTestId(`${formPrefix}-entry${index}valueField`);
    return comboBox.querySelector('input[role="combobox"]') as HTMLInputElement;
  };

  const getEntryRemoveButton = (index: number): HTMLButtonElement =>
    renderResult.getByTestId(`${formPrefix}-entry${index}removeButton`) as HTMLButtonElement;

  const getAndButton = (): HTMLButtonElement =>
    renderResult.getByTestId(`${formPrefix}-AndButton`) as HTMLButtonElement;

  beforeEach(() => {
    resetHTMLElementOffsetWidth = forceHTMLElementOffsetWidth();
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    (licenseService.isEnterprise as jest.Mock).mockReturnValue(true);
    mockedContext = createAppRootMockRenderer();
    latestUpdatedItem = createItem();

    (useFetchIndex as jest.Mock).mockReturnValue([
      false, // isLoading
      {
        indexPatterns: {
          fields: [{ name: 'some.field', type: 'string' }],
          title: 'logs-endpoint.events.device-*',
        },
      },
    ]);

    (useGetTrustedDeviceSuggestions as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    formProps = {
      item: latestUpdatedItem,
      mode: 'create',
      disabled: false,
      error: undefined,
      onChange: jest.fn((updates) => {
        latestUpdatedItem = updates.item;
      }),
    } as unknown as jest.Mocked<ArtifactFormComponentProps>;
  });

  afterEach(() => {
    resetHTMLElementOffsetWidth();
    cleanup();
  });

  it('should display form submission errors', async () => {
    const message = 'submit failure';
    formProps.error = new Error(message) as IHttpFetchError;
    await render();

    expect(renderResult.getByTestId(`${formPrefix}-submitError`).textContent).toMatch(message);
  });

  describe('Details and Conditions', () => {
    beforeEach(async () => {
      await render();
    });

    it('should NOT initially show any inline validation errors', () => {
      expect(renderResult.container.querySelectorAll('.euiFormErrorText').length).toBe(0);
    });

    it('should hide details text when in edit mode', () => {
      formProps.mode = 'edit';
      rerenderWithLatestProps();
      expect(getDetailsBlurb()).toBeNull();
    });

    it('should show name required on blur', async () => {
      await setTextFieldValue(getNameField(), '  ');
      expect(renderResult.getByText(INPUT_ERRORS.name)).toBeTruthy();
    });

    it('should default OS to Windows and Mac', async () => {
      await openOsCombo();
      const option = screen.getByRole('option', { name: OPERATING_SYSTEM_WINDOWS_AND_MAC });
      expect(option).toBeTruthy();
      expect(option.getAttribute('aria-selected')).toBe('true');
    });

    it('should allow user to select between 3 OS options', async () => {
      await openOsCombo();

      const options = Array.from(
        renderResult.baseElement.querySelectorAll('.euiComboBoxOption')
      ).map((el) => el.textContent?.trim());

      expect(options).toEqual([
        OPERATING_SYSTEM_WINDOWS_AND_MAC,
        OS_TITLES[OperatingSystem.WINDOWS],
        OS_TITLES[OperatingSystem.MAC],
      ]);
    });

    it('should correctly edit name', async () => {
      await setTextFieldValue(getNameField(), 'My TD');
      const expected = createOnChangeArgs({
        item: createItem({
          name: 'My TD',
          os_types: [OperatingSystem.WINDOWS, OperatingSystem.MAC],
        }),
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);
    });

    it('should correctly edit description', async () => {
      await setTextFieldValue(getDescriptionField(), 'describe td');
      const expected = createOnChangeArgs({
        item: createItem({
          description: 'describe td',
          os_types: [OperatingSystem.WINDOWS, OperatingSystem.MAC],
        }),
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);
    });

    it('should correctly change OS to Windows', async () => {
      await openOsCombo();
      await userEvent.click(
        screen.getByRole('option', { name: OS_TITLES[OperatingSystem.WINDOWS] })
      );

      const expected = createOnChangeArgs({
        item: createItem({ os_types: [OperatingSystem.WINDOWS] }),
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);
    });
  });

  describe('Conditions', () => {
    beforeEach(async () => {
      await render();
    });

    it('should render field, operator, and value controls with defaults', () => {
      const labels = Array.from(
        renderResult.container.querySelectorAll('.euiFormRow__labelWrapper')
      ).map((label) => (label.textContent || '').trim());

      expect(labels).toEqual(expect.arrayContaining(['Field', 'Operator', 'Value']));
    });

    it('should display field options based on OS selection', async () => {
      // Form defaults to Windows+Mac OS, so USERNAME field should NOT be available
      const fieldSelect = getEntryFieldSelect();
      await userEvent.click(fieldSelect);

      const options = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent?.trim());

      // USERNAME should not be available with Windows+Mac OS
      expect(options).toEqual([
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.DEVICE_ID],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.DEVICE_TYPE],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.HOST],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.MANUFACTURER],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.MANUFACTURER_ID],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_ID],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_NAME],
      ]);
      expect(options).not.toContain(
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.USERNAME]
      );
    });

    it('should show USERNAME field when Windows-only OS is selected', async () => {
      // Change to Windows-only OS first
      await openOsCombo();
      await userEvent.click(
        screen.getByRole('option', { name: OS_TITLES[OperatingSystem.WINDOWS] })
      );

      // Check field options - USERNAME should now be available
      const fieldSelect = getEntryFieldSelect();
      await userEvent.click(fieldSelect);

      const options = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent?.trim());

      expect(options).toEqual([
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.DEVICE_ID],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.DEVICE_TYPE],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.HOST],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.MANUFACTURER],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.MANUFACTURER_ID],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_ID],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_NAME],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.USERNAME],
      ]);
    });

    it('should hide USERNAME field when Mac-only OS is selected', async () => {
      // Change to Mac-only OS first
      await openOsCombo();
      await userEvent.click(screen.getByRole('option', { name: OS_TITLES[OperatingSystem.MAC] }));

      // Wait for component to update after OS change
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Re-render to ensure component reflects the OS change
      rerenderWithLatestProps();

      // Check field options - USERNAME should be hidden
      const fieldSelect = getEntryFieldSelect();
      await userEvent.click(fieldSelect);

      const options = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent?.trim());

      expect(options).toEqual([
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.DEVICE_ID],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.DEVICE_TYPE],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.HOST],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.MANUFACTURER],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.MANUFACTURER_ID],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_ID],
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_NAME],
      ]);
      expect(options).not.toContain(
        CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.USERNAME]
      );
    });

    it('should toggle operator from "is" to "matches" and update entry type to wildcard', async () => {
      const operatorSelect = getEntryOperatorSelect();
      await userEvent.click(operatorSelect);

      const operatorOptions = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent?.trim());

      expect(operatorOptions).toEqual([OPERATOR_TITLES.is, OPERATOR_TITLES.matches]);

      await userEvent.click(screen.getByRole('option', { name: OPERATOR_TITLES.matches }));

      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.item.entries?.[0]?.type).toBe('wildcard');
    });

    it('should clear value field when field selection changes', async () => {
      const valueField = getEntryValueField();
      await setTextFieldValue(valueField, 'device-123');

      const fieldSelect = getEntryFieldSelect();
      await userEvent.click(fieldSelect);
      await userEvent.click(
        screen.getByRole('option', {
          name: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_ID],
        })
      );

      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.item.entries?.[0]?.field).toBe(TrustedDeviceConditionEntryField.PRODUCT_ID);
      expect(lastCall?.item.entries?.[0]?.value).toBe('');

      expect(renderResult.container.querySelectorAll('.euiFormErrorText').length).toBe(0);
    });

    it('should clear only the changed row value and preserve other rows values', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-123'),
          createEntry(TrustedDeviceConditionEntryField.HOST, 'match', 'my-host'),
        ],
      });
      latestUpdatedItem = formProps.item;
      rerenderWithLatestProps();

      await userEvent.click(getEntryFieldSelect(0));
      await userEvent.click(
        screen.getByRole('option', {
          name: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_ID],
        })
      );

      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.item.entries[0].field).toBe(TrustedDeviceConditionEntryField.PRODUCT_ID);
      expect(lastCall?.item.entries[0].value).toBe('');
      expect(lastCall?.item.entries[1].field).toBe(TrustedDeviceConditionEntryField.HOST);
      expect(lastCall?.item.entries[1].value).toBe('my-host');
    });

    it('should show value required error after blur when empty', async () => {
      await setTextFieldValue(getNameField(), 'some name');

      act(() => {
        fireEvent.blur(getEntryValueField());
      });

      expect(renderResult.getByText(INPUT_ERRORS.entryValueEmpty)).toBeTruthy();
    });

    it('should show performance warning when operator is matches and value contains "**"', async () => {
      await userEvent.click(getEntryOperatorSelect());
      await userEvent.click(screen.getByRole('option', { name: OPERATOR_TITLES.matches }));

      // ensure the component receives the updated item with type: 'wildcard'
      rerenderWithLatestProps();

      const valueField = getEntryValueField();
      await setTextFieldValue(valueField, 'prefix**suffix');

      // Re-render so currentItem reflects the typed value before blur
      rerenderWithLatestProps();

      act(() => {
        fireEvent.blur(getEntryValueField());
      });

      // Assert the help text is rendered within the conditions row
      const conditionsRow = renderResult.getByTestId(`${formPrefix}-conditionsRow`);
      expect(
        await within(conditionsRow).findByText((text) =>
          text.toLowerCase().includes('double wildcards')
        )
      ).toBeTruthy();
    });

    it('should remove the USERNAME entry and fall back to a default DEVICE_ID entry when OS changes from Windows to Mac', async () => {
      // Start with a single USERNAME entry and Windows-only OS
      formProps.item = createItem({
        os_types: [OperatingSystem.WINDOWS],
        entries: [createEntry(TrustedDeviceConditionEntryField.USERNAME, 'match', 'testuser')],
      });
      rerenderWithLatestProps();

      // Change OS to Mac-only — USERNAME is not available on Mac, so the entry is removed
      await openOsCombo();
      await userEvent.click(screen.getByRole('option', { name: OS_TITLES[OperatingSystem.MAC] }));

      // The only entry was USERNAME, so entries falls back to [defaultDeviceEntry()] → DEVICE_ID with ''
      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.item.entries).toHaveLength(1);
      expect(lastCall?.item.entries?.[0]?.field).toBe(TrustedDeviceConditionEntryField.DEVICE_ID);
      expect(lastCall?.item.entries?.[0]?.value).toBe('');
      expect(lastCall?.item.os_types).toEqual([OperatingSystem.MAC]);
    });

    it('should remove the USERNAME entry and fall back to a default DEVICE_ID entry when OS changes from Windows to Windows+Mac', async () => {
      // Start with a single USERNAME entry and Windows-only OS
      formProps.item = createItem({
        os_types: [OperatingSystem.WINDOWS],
        entries: [createEntry(TrustedDeviceConditionEntryField.USERNAME, 'match', 'testuser')],
      });
      rerenderWithLatestProps();

      // Change OS to Windows+Mac — USERNAME is not available on Mac (multi-OS), so the entry is removed
      await openOsCombo();
      await userEvent.click(screen.getByRole('option', { name: OPERATING_SYSTEM_WINDOWS_AND_MAC }));

      // The only entry was USERNAME, so entries falls back to [defaultDeviceEntry()] → DEVICE_ID with ''
      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.item.entries).toHaveLength(1);
      expect(lastCall?.item.entries?.[0]?.field).toBe(TrustedDeviceConditionEntryField.DEVICE_ID);
      expect(lastCall?.item.entries?.[0]?.value).toBe('');
      expect(lastCall?.item.os_types).toEqual([OperatingSystem.WINDOWS, OperatingSystem.MAC]);
    });

    it('should preserve HOST field value when OS changes', async () => {
      // Start with HOST field and Mac OS
      formProps.item = createItem({
        os_types: [OperatingSystem.MAC],
        entries: [createEntry(TrustedDeviceConditionEntryField.HOST, 'match', 'myhost')],
      });
      latestUpdatedItem = formProps.item;
      rerenderWithLatestProps();

      // Clear onChange calls to get only the OS change call
      (formProps.onChange as jest.Mock).mockClear();

      // Change OS to Windows+Mac - HOST field should be preserved
      await openOsCombo();
      await userEvent.click(screen.getByRole('option', { name: OPERATING_SYSTEM_WINDOWS_AND_MAC }));

      // Expect field and value to be preserved (no reset for HOST field)
      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.item.entries?.[0]?.field).toBe(TrustedDeviceConditionEntryField.HOST);
      expect(lastCall?.item.entries?.[0]?.value).toBe('myhost');
    });

    describe('Multiple condition entries', () => {
      it('should render an AND button', () => {
        expect(getAndButton()).toBeTruthy();
      });

      it('should add a second entry when the AND button is clicked', async () => {
        await userEvent.click(getAndButton());

        const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
        expect(lastCall?.item.entries).toHaveLength(2);
        expect(lastCall?.item.entries[1]).toMatchObject({
          field: TrustedDeviceConditionEntryField.DEVICE_ID,
          type: 'match',
          operator: 'included',
          value: '',
        });
      });

      it('should not show the AND connector badge with a single entry', () => {
        expect(renderResult.queryByTestId(`${formPrefix}-andConnector`)).toBeNull();
      });

      it('should show the AND connector badge after adding a second entry', async () => {
        await userEvent.click(getAndButton());
        rerenderWithLatestProps();

        expect(renderResult.getByTestId(`${formPrefix}-andConnector`)).toBeTruthy();
      });

      it('should render field, operator, value controls for the second entry', async () => {
        await userEvent.click(getAndButton());
        rerenderWithLatestProps();

        expect(getEntryFieldSelect(1)).toBeTruthy();
        expect(getEntryOperatorSelect(1)).toBeTruthy();
        expect(getEntryValueField(1)).toBeTruthy();
      });

      it('should call onChange with updated entries[1].value when the second entry value changes', async () => {
        await userEvent.click(getAndButton());
        rerenderWithLatestProps();

        const secondValueField = getEntryValueField(1);
        await setTextFieldValue(secondValueField, 'my-second-device');

        const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
        expect(lastCall?.item.entries).toHaveLength(2);
        expect(lastCall?.item.entries[1].value).toBe('my-second-device');
      });
    });

    describe('Entry removal', () => {
      it('should disable the remove button when only one entry exists', () => {
        expect(getEntryRemoveButton(0)).toBeDisabled();
      });

      it('should enable both remove buttons after a second entry is added', async () => {
        await userEvent.click(getAndButton());
        rerenderWithLatestProps();

        expect(getEntryRemoveButton(0)).not.toBeDisabled();
        expect(getEntryRemoveButton(1)).not.toBeDisabled();
      });

      it('should remove entry at index 0 and keep entry at index 1', async () => {
        formProps.item = createItem({
          entries: [
            createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'first-device'),
            createEntry(TrustedDeviceConditionEntryField.HOST, 'match', 'my-host'),
          ],
        });
        latestUpdatedItem = formProps.item;
        rerenderWithLatestProps();

        await userEvent.click(getEntryRemoveButton(0));

        const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
        expect(lastCall?.item.entries).toHaveLength(1);
        expect(lastCall?.item.entries[0].field).toBe(TrustedDeviceConditionEntryField.HOST);
        expect(lastCall?.item.entries[0].value).toBe('my-host');
      });

      it('should remove entry at index 1 and keep entry at index 0', async () => {
        formProps.item = createItem({
          entries: [
            createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'first-device'),
            createEntry(TrustedDeviceConditionEntryField.HOST, 'match', 'my-host'),
          ],
        });
        latestUpdatedItem = formProps.item;
        rerenderWithLatestProps();

        await userEvent.click(getEntryRemoveButton(1));

        const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
        expect(lastCall?.item.entries).toHaveLength(1);
        expect(lastCall?.item.entries[0].field).toBe(TrustedDeviceConditionEntryField.DEVICE_ID);
        expect(lastCall?.item.entries[0].value).toBe('first-device');
      });
    });
  });

  describe('Duplicate field validation', () => {
    it('should show a duplicate field error immediately without requiring user interaction', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-1'),
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-2'),
        ],
      });
      await render();

      // Duplicate errors are always surfaced — no blur or visit required
      expect(
        renderResult.getByText(
          INPUT_ERRORS.noDuplicateField(TrustedDeviceConditionEntryField.DEVICE_ID)
        )
      ).toBeTruthy();
    });

    it('should not show a duplicate field error when entries use different fields', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-1'),
          createEntry(TrustedDeviceConditionEntryField.HOST, 'match', 'my-host'),
        ],
      });
      await render();

      expect(
        renderResult.queryByText(
          INPUT_ERRORS.noDuplicateField(TrustedDeviceConditionEntryField.DEVICE_ID)
        )
      ).toBeNull();
    });

    it('should report isValid as false (disabling the submit button) when a duplicate field error is present', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-1'),
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-2'),
        ],
      });
      await render();

      // Trigger an onChange so we can inspect isValid
      await setTextFieldValue(getNameField(), 'My TD');

      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.isValid).toBe(false);
    });

    it('should show duplicate-field error immediately and empty-value error only after blur', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', ''),
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-2'),
        ],
      });
      await render();

      // Duplicate error visible right away
      expect(
        renderResult.getByText(
          INPUT_ERRORS.noDuplicateField(TrustedDeviceConditionEntryField.DEVICE_ID)
        )
      ).toBeTruthy();
      // Empty-value error not yet shown (no entry visited)
      expect(renderResult.queryByText(INPUT_ERRORS.entryValueEmpty)).toBeNull();

      // After visiting an entry value, the empty-value error also appears
      act(() => {
        fireEvent.blur(getEntryValueField(0));
      });

      expect(renderResult.getByText(INPUT_ERRORS.entryValueEmpty)).toBeTruthy();
      expect(
        renderResult.getByText(
          INPUT_ERRORS.noDuplicateField(TrustedDeviceConditionEntryField.DEVICE_ID)
        )
      ).toBeTruthy();
    });

    it('should keep the duplicate-field error visible after changing the operator', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-1'),
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-2'),
        ],
      });
      await render();

      // Duplicate error is visible immediately
      expect(
        renderResult.getByText(
          INPUT_ERRORS.noDuplicateField(TrustedDeviceConditionEntryField.DEVICE_ID)
        )
      ).toBeTruthy();

      // Change the operator on entry 0
      await userEvent.click(getEntryOperatorSelect(0));
      await userEvent.click(screen.getByRole('option', { name: OPERATOR_TITLES.matches }));
      rerenderWithLatestProps();

      // Duplicate error must still be visible — changing the operator doesn't fix it
      expect(
        renderResult.getByText(
          INPUT_ERRORS.noDuplicateField(TrustedDeviceConditionEntryField.DEVICE_ID)
        )
      ).toBeTruthy();
    });

    it('should hide the empty-value error after changing the operator', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', ''),
          createEntry(TrustedDeviceConditionEntryField.HOST, 'match', 'my-host'),
        ],
      });
      await render();

      // Visit the empty entry to surface its error
      act(() => {
        fireEvent.blur(getEntryValueField(0));
      });
      expect(renderResult.getByText(INPUT_ERRORS.entryValueEmpty)).toBeTruthy();

      // Changing the operator should hide the empty-value error
      await userEvent.click(getEntryOperatorSelect(0));
      await userEvent.click(screen.getByRole('option', { name: OPERATOR_TITLES.matches }));
      rerenderWithLatestProps();

      expect(renderResult.queryByText(INPUT_ERRORS.entryValueEmpty)).toBeNull();
    });

    it('should hide the empty-value error after adding an entry', async () => {
      formProps.item = createItem({
        entries: [createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', '')],
      });
      await render();

      act(() => {
        fireEvent.blur(getEntryValueField(0));
      });
      expect(renderResult.getByText(INPUT_ERRORS.entryValueEmpty)).toBeTruthy();

      await userEvent.click(getAndButton());
      rerenderWithLatestProps();

      expect(renderResult.queryByText(INPUT_ERRORS.entryValueEmpty)).toBeNull();
    });

    it('should hide the empty-value error after removing an entry', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', ''),
          createEntry(TrustedDeviceConditionEntryField.HOST, 'match', 'my-host'),
        ],
      });
      await render();

      act(() => {
        fireEvent.blur(getEntryValueField(0));
      });
      expect(renderResult.getByText(INPUT_ERRORS.entryValueEmpty)).toBeTruthy();

      await userEvent.click(getEntryRemoveButton(1));
      rerenderWithLatestProps();

      expect(renderResult.queryByText(INPUT_ERRORS.entryValueEmpty)).toBeNull();
    });

    it('should show duplicate-field error when two non-adjacent entries share the same field', async () => {
      // entries[0] and entries[2] both use DEVICE_ID; entries[1] uses a different field (HOST)
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-1'),
          createEntry(TrustedDeviceConditionEntryField.HOST, 'match', 'my-host'),
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'device-3'),
        ],
      });
      await render();

      expect(
        renderResult.getByText(
          INPUT_ERRORS.noDuplicateField(TrustedDeviceConditionEntryField.DEVICE_ID)
        )
      ).toBeTruthy();
    });
  });

  describe('Per-entry blur validation', () => {
    it('should show empty-value error when any entry is visited and any entry is empty', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', ''),
          createEntry(TrustedDeviceConditionEntryField.HOST, 'match', ''),
        ],
      });
      await render();

      await setTextFieldValue(getNameField(), 'My TD');
      rerenderWithLatestProps();

      act(() => {
        fireEvent.blur(getEntryValueField(1));
      });

      expect(renderResult.queryByText(INPUT_ERRORS.entryValueEmpty)).toBeTruthy();

      // The form should be invalid (both entries are empty)
      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.isValid).toBe(false);
    });

    it('should show both empty-value and duplicate-field errors when entry 0 is empty, entry 1 has a value, and both use the same field', async () => {
      formProps.item = createItem({
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', ''),
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'some-device'),
        ],
      });
      await render();

      // Duplicate error is visible without any interaction
      expect(
        renderResult.queryByText(
          INPUT_ERRORS.noDuplicateField(TrustedDeviceConditionEntryField.DEVICE_ID)
        )
      ).toBeTruthy();

      // Trigger an onChange so we can later inspect isValid, then blur to surface the empty-value error
      await setTextFieldValue(getNameField(), 'My TD');
      rerenderWithLatestProps();

      act(() => {
        fireEvent.blur(getEntryValueField(1));
      });

      expect(renderResult.queryByText(INPUT_ERRORS.entryValueEmpty)).toBeTruthy();
      expect(
        renderResult.queryByText(
          INPUT_ERRORS.noDuplicateField(TrustedDeviceConditionEntryField.DEVICE_ID)
        )
      ).toBeTruthy();

      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.isValid).toBe(false);
    });
  });

  describe('OS change preserves multiple entries', () => {
    it('should preserve all entries when OS changes and no entry uses USERNAME field', async () => {
      formProps.item = createItem({
        os_types: [OperatingSystem.WINDOWS],
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'dev-1'),
          createEntry(TrustedDeviceConditionEntryField.HOST, 'match', 'host-1'),
        ],
      });
      await render();

      (formProps.onChange as jest.Mock).mockClear();

      await openOsCombo();
      await userEvent.click(screen.getByRole('option', { name: OPERATING_SYSTEM_WINDOWS_AND_MAC }));

      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.item.entries).toHaveLength(2);
      expect(lastCall?.item.entries[0].field).toBe(TrustedDeviceConditionEntryField.DEVICE_ID);
      expect(lastCall?.item.entries[0].value).toBe('dev-1');
      expect(lastCall?.item.entries[1].field).toBe(TrustedDeviceConditionEntryField.HOST);
      expect(lastCall?.item.entries[1].value).toBe('host-1');
    });

    it('should drop only the USERNAME entry and preserve other entries when OS changes to Mac', async () => {
      formProps.item = createItem({
        os_types: [OperatingSystem.WINDOWS],
        entries: [
          createEntry(TrustedDeviceConditionEntryField.DEVICE_ID, 'match', 'dev-1'),
          createEntry(TrustedDeviceConditionEntryField.USERNAME, 'match', 'user-1'),
        ],
      });
      await render();

      (formProps.onChange as jest.Mock).mockClear();

      await openOsCombo();
      await userEvent.click(screen.getByRole('option', { name: OS_TITLES[OperatingSystem.MAC] }));

      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      // USERNAME entry is removed; only the DEVICE_ID entry survives
      expect(lastCall?.item.entries).toHaveLength(1);
      expect(lastCall?.item.entries[0].field).toBe(TrustedDeviceConditionEntryField.DEVICE_ID);
      expect(lastCall?.item.entries[0].value).toBe('dev-1');
    });
  });

  it('should display effective scope options', async () => {
    await render();
    const globalButton = renderResult.getByTestId(
      `${formPrefix}-effectedPolicies-global`
    ) as HTMLButtonElement;

    expect(globalButton.classList.contains('euiButtonGroupButton-isSelected')).toEqual(true);
    expect(
      renderResult.queryByTestId(`${formPrefix}-effectedPolicies-policiesSelectable`)
    ).toBeNull();
    expect(renderResult.queryByTestId('policy-id-0')).toBeNull();
  });

  describe('Suggestions API gating', () => {
    it('should call suggestions hook with enabled=true when index has fields', async () => {
      (useFetchIndex as jest.Mock).mockReturnValue([
        false,
        {
          indexPatterns: {
            fields: [{ name: 'device.id', type: 'string' }],
            title: 'logs-endpoint.events.device-*',
          },
        },
      ]);

      await render();

      expect(useGetTrustedDeviceSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });

    it('should call suggestions hook with enabled=false when index has no fields', async () => {
      (useFetchIndex as jest.Mock).mockReturnValue([
        false,
        {
          indexPatterns: {
            fields: [],
            title: '',
          },
        },
      ]);

      await render();

      expect(useGetTrustedDeviceSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });

    it('should call suggestions hook with enabled=false while index is loading', async () => {
      (useFetchIndex as jest.Mock).mockReturnValue([
        true, // isLoading = true
        {
          indexPatterns: {
            fields: [],
            title: '',
          },
        },
      ]);

      await render();

      expect(useGetTrustedDeviceSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });
  });

  describe('Assignment section visibility', () => {
    it('should show assignment section with enterprise license', async () => {
      (licenseService.isEnterprise as jest.Mock).mockReturnValue(true);
      await render();

      expect(renderResult.getByTestId(`${formPrefix}-policySelection`)).toBeTruthy();
    });

    it('should hide assignment section with non-enterprise license in create mode', async () => {
      (licenseService.isEnterprise as jest.Mock).mockReturnValue(false);
      formProps.mode = 'create';
      await render();

      expect(renderResult.queryByTestId(`${formPrefix}-policySelection`)).toBeNull();
    });

    it('should show assignment section with non-enterprise license in edit mode for by-policy artifacts', async () => {
      (licenseService.isEnterprise as jest.Mock).mockReturnValue(false);
      formProps.mode = 'edit';
      formProps.item = createItem({
        name: 'existing device',
        tags: ['policy:some-policy-id'],
      });
      await render();

      expect(renderResult.getByTestId(`${formPrefix}-policySelection`)).toBeTruthy();
    });

    it('should hide assignment section with non-enterprise license in edit mode for global artifacts', async () => {
      (licenseService.isEnterprise as jest.Mock).mockReturnValue(false);
      formProps.mode = 'edit';
      formProps.item = createItem({
        name: 'existing device',
        tags: ['policy:all'],
      });
      await render();

      expect(renderResult.queryByTestId(`${formPrefix}-policySelection`)).toBeNull();
    });
  });
});
