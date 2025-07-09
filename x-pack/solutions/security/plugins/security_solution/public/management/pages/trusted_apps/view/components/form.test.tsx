/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, cleanup, act, fireEvent, getByTestId } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { TrustedAppEntryTypes } from '@kbn/securitysolution-utils';
import { OperatingSystem, ConditionEntryField } from '@kbn/securitysolution-utils';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import { useFetchIndex } from '../../../../../common/containers/source';

import { TrustedAppsForm } from './form';
import type {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
} from '../../../../components/artifact_list_page';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { INPUT_ERRORS } from '../translations';
import { licenseService } from '../../../../../common/hooks/use_license';
import { forceHTMLElementOffsetWidth } from '../../../../components/effected_policy_select/test_utils';
import type { TrustedAppConditionEntry } from '../../../../../../common/endpoint/types';
import type { IHttpFetchError } from '@kbn/core-http-browser';

jest.mock('../../../../../common/containers/source');
jest.mock('../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

describe('Trusted apps form', () => {
  const formPrefix = 'trustedApps-form';
  let resetHTMLElementOffsetWidth: ReturnType<typeof forceHTMLElementOffsetWidth>;

  let formProps: jest.Mocked<ArtifactFormComponentProps>;
  let mockedContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let latestUpdatedItem: ArtifactFormComponentProps['item'];

  const getUI = () => <TrustedAppsForm {...formProps} />;
  const render = () => {
    return (renderResult = mockedContext.render(getUI()));
  };
  const rerender = () => renderResult.rerender(getUI());
  const rerenderWithLatestProps = () => {
    formProps.item = latestUpdatedItem;
    rerender();
  };

  function createEntry<T extends ConditionEntryField = ConditionEntryField>(
    field: T,
    type: TrustedAppEntryTypes,
    value: string
  ): TrustedAppConditionEntry {
    return {
      field,
      type,
      operator: 'included',
      value,
    };
  }

  function createItem(
    overrides: Partial<ArtifactFormComponentProps['item']> = {}
  ): ArtifactFormComponentProps['item'] {
    const defaults: ArtifactFormComponentProps['item'] = {
      list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
      name: '',
      description: '',
      os_types: [OperatingSystem.WINDOWS],
      entries: [createEntry(ConditionEntryField.HASH, 'match', '')],
      type: 'simple',
      tags: ['policy:all'],
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  function createOnChangeArgs(
    overrides: Partial<ArtifactFormComponentOnChangeCallbackProps>
  ): ArtifactFormComponentOnChangeCallbackProps {
    const defaults = {
      item: createItem(),
      isValid: false,
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  // Some helpers
  const setTextFieldValue = (textField: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    act(() => {
      fireEvent.change(textField, {
        target: { value },
      });
      fireEvent.blur(textField);
    });
  };
  const getDetailsBlurb = (dataTestSub: string = formPrefix): HTMLInputElement => {
    return renderResult.queryByTestId(`${dataTestSub}-about`) as HTMLInputElement;
  };
  const getNameField = (dataTestSub: string = formPrefix): HTMLInputElement => {
    return renderResult.getByTestId(`${dataTestSub}-nameTextField`) as HTMLInputElement;
  };
  const getOsField = (dataTestSub: string = formPrefix): HTMLButtonElement => {
    return renderResult.getByTestId(`${dataTestSub}-osSelectField`) as HTMLButtonElement;
  };
  const getDescriptionField = (dataTestSub: string = formPrefix): HTMLTextAreaElement => {
    return renderResult.getByTestId(`${dataTestSub}-descriptionField`) as HTMLTextAreaElement;
  };
  const getCondition = (index: number = 0, dataTestSub: string = formPrefix): HTMLElement => {
    return renderResult.getByTestId(`${dataTestSub}-conditionsBuilder-group1-entry${index}`);
  };
  const getAllConditions = (dataTestSub: string = formPrefix): HTMLElement[] => {
    return Array.from(
      renderResult.getByTestId(`${dataTestSub}-conditionsBuilder-group1-entries`).children
    ) as HTMLElement[];
  };
  const getConditionRemoveButton = (condition: HTMLElement): HTMLButtonElement => {
    return getByTestId(condition, `${condition.dataset.testSubj}-remove`) as HTMLButtonElement;
  };
  const getConditionFieldSelect = (condition: HTMLElement): HTMLButtonElement => {
    return getByTestId(condition, `${condition.dataset.testSubj}-field`) as HTMLButtonElement;
  };

  const getConditionValue = (condition: HTMLElement): HTMLInputElement => {
    return getByTestId(condition, `${condition.dataset.testSubj}-value`) as HTMLInputElement;
  };
  const getConditionBuilderAndButton = (dataTestSub: string = formPrefix): HTMLButtonElement => {
    return renderResult.getByTestId(
      `${dataTestSub}-conditionsBuilder-group1-AndButton`
    ) as HTMLButtonElement;
  };
  const getConditionBuilderAndConnectorBadge = (dataTestSub: string = formPrefix): HTMLElement => {
    return renderResult.getByTestId(`${dataTestSub}-conditionsBuilder-group1-andConnector`);
  };
  const getAllValidationErrors = (): HTMLElement[] => {
    return Array.from(renderResult.container.querySelectorAll('.euiFormErrorText'));
  };
  const getAllValidationWarnings = (): HTMLElement[] => {
    return Array.from(renderResult.container.querySelectorAll('.euiFormHelpText'));
  };

  beforeEach(() => {
    resetHTMLElementOffsetWidth = forceHTMLElementOffsetWidth();
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    mockedContext = createAppRootMockRenderer();
    latestUpdatedItem = createItem();
    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);

    formProps = {
      item: latestUpdatedItem,
      mode: 'create',
      disabled: false,
      error: undefined,
      onChange: jest.fn((updates) => {
        latestUpdatedItem = updates.item;
      }),
    };
  });

  afterEach(() => {
    resetHTMLElementOffsetWidth();
    cleanup();
  });

  it('should display form submission errors', () => {
    const message = 'oh oh - failed';
    formProps.error = new Error(message) as IHttpFetchError;
    render();

    expect(renderResult.getByTestId(`${formPrefix}-submitError`).textContent).toMatch(message);
  });

  describe('Details and Conditions', () => {
    beforeEach(() => render());

    it('should NOT initially show any inline validation errors', () => {
      expect(renderResult.container.querySelectorAll('.euiFormErrorText').length).toBe(0);
    });

    it('should hide details text when in edit mode', () => {
      formProps.mode = 'edit';
      rerenderWithLatestProps();
      expect(getDetailsBlurb()).toBeNull();
    });

    it('should show name required name blur', () => {
      setTextFieldValue(getNameField(), '  ');
      expect(renderResult.getByText(INPUT_ERRORS.name)).toBeTruthy();
    });

    it('should default OS to Windows', () => {
      // Note: the trailing `, ` comes from screen-reader-only text
      expect(getOsField().textContent).toEqual('Windows, ');
    });

    it('should allow user to select between 3 OSs', async () => {
      const osField = getOsField();
      await userEvent.click(osField);
      const options = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent);
      expect(options).toEqual(['Linux', 'Mac', 'Windows']);
    });

    it('should show Description as optional', () => {
      expect(getDescriptionField().required).toBe(false);
    });

    it('should be invalid if no name', () => {
      const emptyName = '  ';
      setTextFieldValue(getNameField(), emptyName);
      const expected = createOnChangeArgs({
        item: createItem({
          name: emptyName,
        }),
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);
    });

    it('should correctly edit name', () => {
      setTextFieldValue(getNameField(), 'z');
      const expected = createOnChangeArgs({
        item: createItem({
          name: 'z',
        }),
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);
    });

    it('should correctly edit description', () => {
      setTextFieldValue(getDescriptionField(), 'describe ta');
      const expected = createOnChangeArgs({
        item: createItem({ description: 'describe ta' }),
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);
    });

    it('should correctly change OS', async () => {
      await userEvent.click(getOsField());
      await waitForEuiPopoverOpen();
      await userEvent.click(screen.getByRole('option', { name: 'Linux' }));
      const expected = createOnChangeArgs({
        item: createItem({ os_types: [OperatingSystem.LINUX] }),
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);
    });
  });

  describe('ConditionBuilder', () => {
    beforeEach(() => render());

    it('should default to hash entry field', () => {
      const defaultCondition = getCondition();
      const labels = Array.from(defaultCondition.querySelectorAll('.euiFormRow__labelWrapper')).map(
        (label) => (label.textContent || '').trim()
      );
      expect(labels).toEqual(['Field', 'Operator', 'Value', '']);
      expect(formProps.onChange).not.toHaveBeenCalled();
    });

    it('should not allow the entry to be removed if its the only one displayed', () => {
      const defaultCondition = getCondition();
      expect(getConditionRemoveButton(defaultCondition).disabled).toBe(true);
    });

    it('should display 3 options for Field for Windows', async () => {
      const conditionFieldSelect = getConditionFieldSelect(getCondition());
      await userEvent.click(conditionFieldSelect);
      const options = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent);
      expect(options.length).toEqual(3);
      expect(options).toEqual([
        'Hashmd5, sha1, or sha256',
        'PathThe full path of the application',
        'SignatureThe signer of the application',
      ]);
    });

    it('should show the value field as required after blur', () => {
      expect(getConditionValue(getCondition()).required).toEqual(false);
      act(() => {
        fireEvent.blur(getConditionValue(getCondition()));
      });
      expect(getConditionValue(getCondition()).required).toEqual(true);
    });

    describe('IS operator', () => {
      it('should show path malformed warning', () => {
        render();
        expect(screen.queryByText(INPUT_ERRORS.pathWarning(0))).toBeNull();

        const propsItem: Partial<ArtifactFormComponentProps['item']> = {
          entries: [createEntry(ConditionEntryField.PATH, 'match', 'malformed-path')],
        };
        formProps.item = { ...formProps.item, ...propsItem };
        render();
        expect(screen.getByText(INPUT_ERRORS.pathWarning(0))).not.toBeNull();
      });

      it('should show path malformed path warning for linux/mac without an executable name', () => {
        render();
        expect(screen.queryByText(INPUT_ERRORS.pathWarning(0))).toBeNull();
        expect(screen.queryByText(INPUT_ERRORS.wildcardPathWarning(0))).toBeNull();

        const propsItem: Partial<ArtifactFormComponentProps['item']> = {
          os_types: [OperatingSystem.LINUX],
          entries: [createEntry(ConditionEntryField.PATH, 'match', '/')],
        };
        formProps.item = { ...formProps.item, ...propsItem };
        render();
        expect(screen.getByText(INPUT_ERRORS.pathWarning(0))).not.toBeNull();
        expect(screen.queryByText(INPUT_ERRORS.wildcardPathWarning(0))).toBeNull();
      });

      it('should show path malformed path warning for windows with no executable name', () => {
        render();
        expect(screen.queryByText(INPUT_ERRORS.pathWarning(0))).toBeNull();
        expect(screen.queryByText(INPUT_ERRORS.wildcardPathWarning(0))).toBeNull();

        const propsItem: Partial<ArtifactFormComponentProps['item']> = {
          os_types: [OperatingSystem.WINDOWS],
          entries: [createEntry(ConditionEntryField.PATH, 'match', 'c:\\fold\\')],
        };
        formProps.item = { ...formProps.item, ...propsItem };
        render();
        expect(screen.getByText(INPUT_ERRORS.pathWarning(0))).not.toBeNull();
        expect(screen.queryByText(INPUT_ERRORS.wildcardPathWarning(0))).toBeNull();
      });
    });

    describe('MATCHES operator', () => {
      it('should show wildcard in path warning', () => {
        render();
        expect(screen.queryByText(INPUT_ERRORS.wildcardPathWarning(0))).toBeNull();

        const propsItem: Partial<ArtifactFormComponentProps['item']> = {
          os_types: [OperatingSystem.LINUX],
          entries: [createEntry(ConditionEntryField.PATH, 'wildcard', '/sys/wil*/*.app')],
        };
        formProps.item = { ...formProps.item, ...propsItem };
        render();
        expect(screen.getByText(INPUT_ERRORS.wildcardPathWarning(0))).not.toBeNull();
      });
    });

    it('should display the `AND` button', () => {
      const andButton = getConditionBuilderAndButton();
      expect(andButton.textContent).toEqual('AND');
      expect(andButton.disabled).toEqual(false);
    });

    describe('and when the AND button is clicked', () => {
      beforeEach(async () => {
        const andButton = getConditionBuilderAndButton();
        await userEvent.click(andButton);
        // re-render with updated `newTrustedApp`
        formProps.item = formProps.onChange.mock.calls[0][0].item;
        rerender();
      });

      it('should add a new condition entry when `AND` is clicked with no column labels', () => {
        const condition2 = getCondition(1);
        expect(condition2.querySelectorAll('.euiFormRow__labelWrapper')).toHaveLength(0);
      });

      it('should have remove buttons enabled when multiple conditions are present', () => {
        getAllConditions().forEach((condition) => {
          expect(getConditionRemoveButton(condition).disabled).toBe(false);
        });
      });

      it('should show the AND visual connector when multiple entries are present', () => {
        expect(getConditionBuilderAndConnectorBadge().textContent).toEqual('AND');
      });
    });
  });

  it('should display effective scope options', () => {
    render();
    const globalButton = renderResult.getByTestId(
      `${formPrefix}-effectedPolicies-global`
    ) as HTMLButtonElement;

    expect(globalButton.classList.contains('euiButtonGroupButton-isSelected')).toEqual(true);
    expect(
      renderResult.queryByTestId(`${formPrefix}-effectedPolicies-policiesSelectable`)
    ).toBeNull();
    expect(renderResult.queryByTestId('policy-id-0')).toBeNull();
  });

  describe('and the user visits required fields but does not fill them out', () => {
    beforeEach(() => {
      render();
      act(() => {
        fireEvent.blur(getNameField());
      });
      act(() => {
        fireEvent.blur(getConditionValue(getCondition()));
      });
    });

    it('should show Name validation error', () => {
      expect(renderResult.getByText(INPUT_ERRORS.name)).not.toBeNull();
    });

    it('should show Condition validation error', () => {
      expect(renderResult.getByText(INPUT_ERRORS.mustHaveValue(0)));
    });

    it('should NOT display any other errors', () => {
      expect(getAllValidationErrors()).toHaveLength(2);
    });
  });

  describe('and invalid data is entered', () => {
    beforeEach(() => render());

    it('should validate that Name has a non empty space value', () => {
      setTextFieldValue(getNameField(), '  ');
      expect(renderResult.getByText(INPUT_ERRORS.name));
    });

    it('should validate invalid Hash value', () => {
      setTextFieldValue(getConditionValue(getCondition()), 'someHASH');
      expect(renderResult.getByText(INPUT_ERRORS.invalidHash(0)));
    });

    it('should validate that a condition value has a non empty space value', () => {
      setTextFieldValue(getConditionValue(getCondition()), '  ');
      expect(renderResult.getByText(INPUT_ERRORS.mustHaveValue(0)));
    });

    it('should validate all condition values (when multiples exist) have non empty space value', async () => {
      const andButton = getConditionBuilderAndButton();
      await userEvent.click(andButton);
      rerenderWithLatestProps();

      setTextFieldValue(getConditionValue(getCondition()), 'someHASH');
      rerenderWithLatestProps();

      expect(renderResult.getByText(INPUT_ERRORS.mustHaveValue(1)));
    });

    it('should validate duplicated conditions', async () => {
      const andButton = getConditionBuilderAndButton();
      await userEvent.click(andButton);

      setTextFieldValue(getConditionValue(getCondition()), '');
      rerenderWithLatestProps();

      expect(renderResult.getByText(INPUT_ERRORS.noDuplicateField(ConditionEntryField.HASH)));
    });

    it('should validate multiple errors in form', async () => {
      const andButton = getConditionBuilderAndButton();

      await userEvent.click(andButton);
      rerenderWithLatestProps();

      setTextFieldValue(getConditionValue(getCondition()), 'someHASH');
      rerenderWithLatestProps();
      expect(renderResult.getByText(INPUT_ERRORS.invalidHash(0)));
      expect(renderResult.getByText(INPUT_ERRORS.mustHaveValue(1)));
    });
  });

  describe('and a wildcard value is used with the IS operator', () => {
    beforeEach(() => render());
    it('shows warning callout and help text warning if the field is PATH', async () => {
      const propsItem: Partial<ArtifactFormComponentProps['item']> = {
        entries: [createEntry(ConditionEntryField.PATH, 'match', '')],
      };
      latestUpdatedItem = { ...formProps.item, ...propsItem };
      rerenderWithLatestProps();

      act(() => {
        setTextFieldValue(getConditionValue(getCondition()), 'somewildcard*');
      });

      expect(renderResult.getByTestId('wildcardWithWrongOperatorCallout'));
      expect(renderResult.getByText(INPUT_ERRORS.wildcardWithWrongOperatorWarning(0))).toBeTruthy();
    });

    it('shows a warning if field is HASH or SIGNATURE', () => {
      setTextFieldValue(getConditionValue(getCondition()), 'somewildcard*');
      rerenderWithLatestProps();
      expect(renderResult.getByText(INPUT_ERRORS.wildcardWithWrongField(0))).toBeTruthy();
    });
  });

  describe('and all required data passes validation', () => {
    it('should call change callback with isValid set to true and contain the new item', () => {
      const propsItem: Partial<ArtifactFormComponentProps['item']> = {
        os_types: [OperatingSystem.LINUX],
        name: 'Some process',
        description: 'some description',
        entries: [
          createEntry(ConditionEntryField.HASH, 'match', 'e50fb1a0e5fff590ece385082edc6c41'),
        ],
      };
      formProps.item = { ...formProps.item, ...propsItem };
      render();
      act(() => {
        fireEvent.blur(getNameField());
      });

      expect(getAllValidationErrors()).toHaveLength(0);
      const expected = createOnChangeArgs({
        isValid: true,
        item: createItem(propsItem),
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);
    });

    it('should not validate form to true if name input is empty', () => {
      const propsItem: Partial<ArtifactFormComponentProps['item']> = {
        name: 'some name',
        os_types: [OperatingSystem.LINUX],
        entries: [createEntry(ConditionEntryField.PATH, 'wildcard', '/sys/usr*/doc.app')],
      };
      formProps.item = { ...formProps.item, ...propsItem };
      render();
      expect(getAllValidationErrors()).toHaveLength(0);
      expect(getAllValidationWarnings()).toHaveLength(0);

      formProps.item.name = '';
      rerender();
      act(() => {
        fireEvent.blur(getNameField());
      });
      expect(getAllValidationErrors()).toHaveLength(1);
      expect(getAllValidationWarnings()).toHaveLength(0);
      expect(formProps.onChange).toHaveBeenLastCalledWith({
        isValid: false,
        item: {
          ...formProps.item,
          name: '',
          os_types: [OperatingSystem.LINUX],
          entries: [
            {
              field: ConditionEntryField.PATH,
              operator: 'included',
              type: 'wildcard',
              value: '/sys/usr*/doc.app',
            },
          ],
        },
      });
    });
  });
});
