/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, cleanup, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
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
    // For EuiComboBox (has role="combobox"), use userEvent.type
    if (textField.getAttribute('role') === 'combobox') {
      await userEvent.clear(textField);
      await userEvent.type(textField, value);
      // Press Enter to create the custom option
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

  const getConditionsFieldSelect = (dataTestSub: string = formPrefix): HTMLButtonElement => {
    return renderResult.getByTestId(`${dataTestSub}-fieldSelect`) as HTMLButtonElement;
  };

  const getConditionsOperatorSelect = (dataTestSub: string = formPrefix): HTMLButtonElement => {
    return renderResult.getByTestId(`${dataTestSub}-operatorSelect`) as HTMLButtonElement;
  };

  const getConditionsValueField = (dataTestSub: string = formPrefix): HTMLInputElement => {
    const comboBox = renderResult.getByTestId(`${dataTestSub}-valueField`);
    // EuiComboBox has a searchable input inside it
    const searchInput = comboBox.querySelector('input[role="combobox"]');
    return searchInput as HTMLInputElement;
  };

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
        renderResult.baseElement.querySelectorAll('button[role="option"]')
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

  // FLAKY: https://github.com/elastic/kibana/issues/253353
  describe.skip('Conditions', () => {
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
      const fieldSelect = getConditionsFieldSelect();
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
      const fieldSelect = getConditionsFieldSelect();
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
      const fieldSelect = getConditionsFieldSelect();
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
      const operatorSelect = getConditionsOperatorSelect();
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
      const valueField = getConditionsValueField();
      await setTextFieldValue(valueField, 'device-123');

      const fieldSelect = getConditionsFieldSelect();
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

    it('should show value required error after blur when empty', async () => {
      await setTextFieldValue(getNameField(), 'some name');

      act(() => {
        fireEvent.blur(getConditionsValueField());
      });

      expect(renderResult.getByText(INPUT_ERRORS.entryValueEmpty)).toBeTruthy();
    });

    it('should show performance warning when operator is matches and value contains "**"', async () => {
      await userEvent.click(getConditionsOperatorSelect());
      await userEvent.click(screen.getByRole('option', { name: OPERATOR_TITLES.matches }));

      // ensure the component receives the updated item with type: 'wildcard'
      rerenderWithLatestProps();

      const valueField = getConditionsValueField();
      await setTextFieldValue(valueField, 'prefix**suffix');

      act(() => {
        fireEvent.blur(valueField);
      });

      // Assert the help text is rendered within the conditions row
      const conditionsRow = renderResult.getByTestId(`${formPrefix}-conditionsRow`);
      expect(
        await within(conditionsRow).findByText((text) =>
          text.toLowerCase().includes('double wildcards')
        )
      ).toBeTruthy();
    });

    it('should reset USERNAME field to DEVICE_ID when OS changes from Windows to Mac', async () => {
      // Start with USERNAME field and Windows OS
      formProps.item = createItem({
        os_types: [OperatingSystem.WINDOWS],
        entries: [createEntry(TrustedDeviceConditionEntryField.USERNAME, 'match', 'testuser')],
      });
      rerenderWithLatestProps();

      // Change OS to Mac-only
      await openOsCombo();
      await userEvent.click(screen.getByRole('option', { name: OS_TITLES[OperatingSystem.MAC] }));

      // Expect field to be reset to DEVICE_ID and value cleared
      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCall?.item.entries?.[0]?.field).toBe(TrustedDeviceConditionEntryField.DEVICE_ID);
      expect(lastCall?.item.entries?.[0]?.value).toBe('');
      expect(lastCall?.item.os_types).toEqual([OperatingSystem.MAC]);
    });

    it('should reset USERNAME field to DEVICE_ID when OS changes from Windows to Windows+Mac', async () => {
      // Start with USERNAME field and Windows OS
      formProps.item = createItem({
        os_types: [OperatingSystem.WINDOWS],
        entries: [createEntry(TrustedDeviceConditionEntryField.USERNAME, 'match', 'testuser')],
      });
      rerenderWithLatestProps();

      // Change OS to Windows+Mac
      await openOsCombo();
      await userEvent.click(screen.getByRole('option', { name: OPERATING_SYSTEM_WINDOWS_AND_MAC }));

      // Expect field to be reset to DEVICE_ID and value cleared
      const lastCall = (formProps.onChange as jest.Mock).mock.calls.at(-1)?.[0];
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
