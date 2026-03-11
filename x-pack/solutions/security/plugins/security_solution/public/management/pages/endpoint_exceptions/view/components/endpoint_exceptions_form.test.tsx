/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useCallback, useState } from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import type { EndpointExceptionsFormProps } from './endpoint_exceptions_form';
import { EndpointExceptionsForm } from './endpoint_exceptions_form';
import { useFetchIndex } from '../../../../../common/containers/source';
import { ENDPOINT_EXCEPTIONS_LIST_DEFINITION } from '../../constants';
import { licenseService } from '../../../../../common/hooks/use_license';
import { GLOBAL_ARTIFACT_TAG } from '../../../../../../common/endpoint/service/artifacts';
import { useFetchPolicyData } from '../../../../components/policy_selector/hooks/use_fetch_policy_data';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { buildPerPolicyTag } from '../../../../../../common/endpoint/service/artifacts/utils';

jest.setTimeout(15_000);

jest.mock('../../../../../common/components/user_privileges');
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/containers/source');
jest.mock('../../../../../common/hooks/use_license');
jest.mock('../../../../components/policy_selector/hooks/use_fetch_policy_data');

/** When some props and states change, `EndpointExceptionsForm` will recreate its internal `processChanged` function,
 * and therefore will call it from a `useEffect` hook.
 *
 * Amongst the aforementioned props is the item itself, which comes from the outside - the test environment.
 * Amongst the aforementioned states is the `hasFormChanged` state, which will change from `false` to `true`
 * on the first user action.
 *
 * In the browser, the `item` prop is a state, a state from the parent component, therefore both
 * `item` and `hasFormChange` will change at the same re-render, which ensures that the `useEffect` will
 * call `processChanged` with consistent data.
 *
 * In the test environment, however, we need a trick to make sure that the data is updated in the same re-render
 * both outside and inside the component, in order to not receive additional calls from `processChanged` with outdated
 * data.
 *
 * This `TestComponentWrapper` component is meant to provide this kind of syncronisation, by turning the `item` prop
 * into a state.
 *
 */
const TestComponentWrapper: typeof EndpointExceptionsForm = (
  formProps: EndpointExceptionsFormProps
) => {
  const [item, setItem] = useState(formProps.item);

  const handleOnChange: EndpointExceptionsFormProps['onChange'] = useCallback(
    (formStatus) => {
      setItem(formStatus.item);
      formProps.onChange(formStatus);
    },
    [formProps]
  );

  return <EndpointExceptionsForm {...formProps} item={item} onChange={handleOnChange} />;
};

describe('Endpoint exceptions form', () => {
  const formPrefix = 'endpointExceptions-form';

  let formProps: jest.Mocked<EndpointExceptionsFormProps>;
  let mockedContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let latestUpdatedItem: EndpointExceptionsFormProps['item'];
  let isLatestUpdatedItemValid: boolean;

  const getUI = () => <TestComponentWrapper {...formProps} />;
  const render = () => {
    return (renderResult = mockedContext.render(getUI()));
  };
  const rerender = () => renderResult.rerender(getUI());
  const rerenderWithLatestProps = () => {
    formProps.item = latestUpdatedItem;
    rerender();
  };

  function createEntry(
    overrides?: ExceptionListItemSchema['entries'][number]
  ): ExceptionListItemSchema['entries'][number] {
    const defaultEntry: ExceptionListItemSchema['entries'][number] = {
      field: '',
      operator: 'included',
      type: 'match',
      value: '',
    };

    return {
      ...defaultEntry,
      ...overrides,
    };
  }

  function createItem(
    overrides: Partial<EndpointExceptionsFormProps['item']> = {}
  ): EndpointExceptionsFormProps['item'] {
    const defaults: EndpointExceptionsFormProps['item'] = {
      id: 'some_item_id',
      list_id: ENDPOINT_EXCEPTIONS_LIST_DEFINITION.list_id ?? 'endpoint_exceptions',
      name: '',
      description: '',
      os_types: [OperatingSystem.WINDOWS],
      entries: [createEntry()],
      type: 'simple',
      tags: [],
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  const setValidItemForEditing = () => {
    formProps.mode = 'edit';
    formProps.item.name = 'item name';
    formProps.item.entries = [
      { field: 'test.field', operator: 'included', type: 'match', value: 'test value' },
    ];
  };

  beforeEach(async () => {
    mockedContext = createAppRootMockRenderer();
    latestUpdatedItem = createItem();
    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);
    (useFetchPolicyData as jest.MockedFunction<typeof useFetchPolicyData>).mockReturnValue({
      isLoading: false,
      isFetching: false,
      error: null,
      data: {
        total: 2,
        perPage: 2,
        page: 1,
        items: [
          { id: 'policy-1', name: 'Policy 1' },
          { id: 'policy-2', name: 'Policy 2' },
        ] as PackagePolicy[],
      },
    });

    formProps = {
      item: latestUpdatedItem,
      mode: 'create',
      disabled: false,
      error: undefined,
      onChange: jest.fn((updates) => {
        latestUpdatedItem = updates.item;
        isLatestUpdatedItemValid = updates.isValid;
      }),
    };
  });

  afterEach(() => {
    cleanup();
  });

  describe('Details and Conditions', () => {
    it('should display sections', async () => {
      await act(() => render());
      expect(renderResult.queryByText('Details')).toBeInTheDocument();
      expect(renderResult.queryByText('Conditions')).toBeInTheDocument();
      expect(renderResult.queryByText('Comments')).toBeInTheDocument();
    });

    it('should display name error only when on blur and empty name', async () => {
      const NAME_ERROR = "The name can't be empty";
      render();
      expect(renderResult.queryByText(NAME_ERROR)).not.toBeInTheDocument();
      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);
      fireEvent.blur(nameInput);
      rerenderWithLatestProps();
      expect(renderResult.queryByText(NAME_ERROR)).toBeInTheDocument();
    });

    it('should change name', async () => {
      render();
      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);

      await userEvent.type(nameInput, 'Exception name');
      rerenderWithLatestProps();

      expect(formProps.item?.name).toBe('Exception name');
    });

    it('should change name with a white space still shows an error', async () => {
      const NAME_ERROR = "The name can't be empty";
      render();
      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);

      await userEvent.type(nameInput, '   ');
      fireEvent.blur(nameInput);
      rerenderWithLatestProps();

      expect(formProps.item.name).toBe('');
      expect(renderResult.queryByText(NAME_ERROR)).toBeInTheDocument();
    });

    it('should change description', async () => {
      render();
      const descriptionInput = renderResult.getByTestId(`${formPrefix}-description-input`);

      await userEvent.type(descriptionInput, 'Exception description');
      rerenderWithLatestProps();

      expect(formProps.item.description).toBe('Exception description');
    });

    it('should change comments', async () => {
      render();
      const commentInput = renderResult.getByLabelText('Comment Input');

      await userEvent.type(commentInput, 'Exception comment');
      rerenderWithLatestProps();

      expect(formProps.item.comments).toEqual([{ comment: 'Exception comment' }]);
    });

    it('should change OS', async () => {
      render();
      const osSelect = renderResult.getByTestId(`${formPrefix}-osSelectField`);
      expect(osSelect).toBeInTheDocument();

      await userEvent.click(osSelect!);
      const macOption = renderResult.getByText('Mac');
      await userEvent.click(macOption);

      await waitFor(() => {
        expect(latestUpdatedItem.os_types).toEqual([OperatingSystem.MAC]);
      });
    });

    it('should display OS options for Windows, Mac, Linux, and Windows+Mac', async () => {
      render();
      const osSelect = renderResult.getByTestId(`${formPrefix}-osSelectField`);
      expect(osSelect).toBeInTheDocument();
      await userEvent.click(osSelect!);

      const options = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent);
      expect(options).toEqual(['Windows', 'Mac', 'Linux', 'Windows and Mac']);
    });

    it('should select Windows and Mac OS option', async () => {
      render();
      const osSelect = renderResult.getByTestId(`${formPrefix}-osSelectField`);
      await userEvent.click(osSelect!);

      const windowsAndMacOption = renderResult.getByText('Windows and Mac');
      await userEvent.click(windowsAndMacOption);

      await waitFor(() => {
        expect(latestUpdatedItem.os_types).toEqual([OperatingSystem.WINDOWS, OperatingSystem.MAC]);
      });
    });

    describe('when opened for editing', () => {
      beforeEach(() => {
        setValidItemForEditing();
      });

      it('item should not be valid when opened for editing', async () => {
        render();
        expect(isLatestUpdatedItemValid).toBe(false);
      });

      it('item should be valid after editing name', async () => {
        render();
        const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'updated name');
        rerenderWithLatestProps();

        expect(isLatestUpdatedItemValid).toBe(true);
      });

      it('item should be valid after editing description', async () => {
        render();
        const descriptionInput = renderResult.getByTestId(`${formPrefix}-description-input`);
        await userEvent.type(descriptionInput, ' updated');
        rerenderWithLatestProps();

        expect(isLatestUpdatedItemValid).toBe(true);
      });

      it('item should be valid after editing comment', async () => {
        render();
        const commentInput = renderResult.getByLabelText('Comment Input');
        await userEvent.type(commentInput, 'new comment');
        rerenderWithLatestProps();

        expect(isLatestUpdatedItemValid).toBe(true);
      });
    });
  });

  describe('Warnings', () => {
    describe('duplicate fields', () => {
      beforeEach(() => {
        formProps.item.name = 'test name';
      });

      it('should not show warning text when unique fields are added', async () => {
        formProps.item.entries = [
          {
            field: 'process.name',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
          {
            field: 'file.path',
            operator: 'excluded',
            type: 'match',
            value: 'some other value',
          },
        ];
        render();

        await waitFor(() => {
          expect(renderResult.queryByDisplayValue('some value')).toBeInTheDocument();
        });

        expect(
          renderResult.queryByTestId('duplicate-fields-warning-message')
        ).not.toBeInTheDocument();
      });

      it('should not show warning text when field values are not added', async () => {
        formProps.item.entries = [
          {
            field: 'process.name',
            operator: 'included',
            type: 'match',
            value: '',
          },
          {
            field: 'process.name',
            operator: 'excluded',
            type: 'match',
            value: '',
          },
        ];
        render();

        await waitFor(() => {
          expect(renderResult.getAllByTestId('fieldAutocompleteComboBox').length).toBe(2);
        });

        expect(
          renderResult.queryByTestId('duplicate-fields-warning-message')
        ).not.toBeInTheDocument();
      });

      it('should show warning text when duplicate fields are added with values', async () => {
        formProps.item.entries = [
          {
            field: 'process.name',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
          {
            field: 'process.name',
            operator: 'excluded',
            type: 'match',
            value: 'some other value',
          },
        ];
        render();

        await waitFor(() => {
          expect(renderResult.getByTestId('duplicate-fields-warning-message')).toBeInTheDocument();
        });
      });
    });

    describe('wildcard with wrong operator', () => {
      beforeEach(() => {
        formProps.item.name = 'test name';
        formProps.item.entries = [
          {
            field: 'process.code_signature.subject_name',
            operator: 'included',
            type: 'match',
            value: 'C:\\*\\test.exe',
          },
        ];
      });

      it('should display warning when wildcard is used with IS operator', async () => {
        await act(() => render());

        expect(renderResult.getByTestId('wildcardWithWrongOperatorCallout')).toBeInTheDocument();
      });

      it('should provide confirm modal labels when wildcard warning exists', async () => {
        render();

        await waitFor(() => {
          expect(formProps.onChange).toHaveBeenCalledWith(
            expect.objectContaining({
              confirmModalLabels: expect.anything(),
            })
          );
        });
      });
    });

    describe('partial code signature', () => {
      it('should display warning for partial code signature entry', async () => {
        formProps.item.name = 'test name';
        formProps.item.entries = [
          {
            field: 'process.code_signature.subject_name',
            operator: 'included',
            type: 'match',
            value: 'test',
          },
        ];

        await act(() => render());

        expect(renderResult.getByTestId('partialCodeSignatureCallout')).toBeInTheDocument();
      });
    });
  });

  describe('Errors', () => {
    beforeEach(() => {
      setValidItemForEditing();
    });

    it('should display form submission errors', async () => {
      const message = 'Submission failed';
      formProps.error = {
        message,
        body: { message },
        name: 'Error',
        request: {} as Request,
      };
      await act(() => render());

      expect(renderResult.getByTestId(`${formPrefix}-submitError`).textContent).toMatch(message);
    });

    it('should not be valid with empty condition value', async () => {
      formProps.item.entries = [
        {
          field: 'file.path',
          operator: 'included',
          type: 'match',
          value: '',
        },
      ];
      await act(() => render());

      expect(isLatestUpdatedItemValid).toBe(false);
    });

    it('should not be valid with empty name', async () => {
      formProps.item.name = '';
      render();

      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);
      fireEvent.blur(nameInput);
      rerenderWithLatestProps();

      expect(isLatestUpdatedItemValid).toBe(false);
    });
  });

  describe('allowSelectOs prop', () => {
    it('should show OS selector when allowSelectOs is true', async () => {
      await act(() => render());
      const osSelect = renderResult.getByTestId(`${formPrefix}-osSelectField`);
      expect(osSelect).toBeInTheDocument();
    });

    it('should hide OS selector when allowSelectOs is false', async () => {
      formProps.allowSelectOs = false;
      await act(() => render());
      expect(renderResult.queryByTestId(`${formPrefix}-osSelectField`)).not.toBeInTheDocument();
    });
  });

  describe('Policy assignment', () => {
    const mockLicenseService = licenseService as jest.Mocked<typeof licenseService>;

    beforeEach(() => {
      mockLicenseService.isPlatinumPlus.mockReturnValue(true);
    });

    it('should not display policy assignment when license is below platinum', async () => {
      mockLicenseService.isPlatinumPlus.mockReturnValue(false);
      await act(() => render());

      expect(renderResult.queryByTestId(`${formPrefix}-effectedPolicies`)).not.toBeInTheDocument();
    });

    it('should display policy assignment when license is at least platinum', async () => {
      await act(() => render());
      expect(renderResult.queryByTestId(`${formPrefix}-effectedPolicies`)).toBeInTheDocument();
    });

    it('should add global tag when global policy is selected', async () => {
      formProps.item.tags = ['policy:1234'];
      render();

      await userEvent.click(renderResult.getByTestId(`${formPrefix}-effectedPolicies-global`));
      rerenderWithLatestProps();

      expect(formProps.item.tags).toEqual([GLOBAL_ARTIFACT_TAG]);
    });

    it('should remove tags when no policy is selected', async () => {
      formProps.item.tags = [GLOBAL_ARTIFACT_TAG];
      render();

      await userEvent.click(renderResult.getByTestId(`${formPrefix}-effectedPolicies-perPolicy`));
      rerenderWithLatestProps();

      expect(formProps.item.tags).toEqual([]);
    });

    it('should add policy tags when specific policies are selected', async () => {
      formProps.item.tags = [GLOBAL_ARTIFACT_TAG];

      render();

      await userEvent.click(renderResult.getByTestId(`${formPrefix}-effectedPolicies-perPolicy`));
      await userEvent.click(
        renderResult.getByTestId(`${formPrefix}-effectedPolicies-policiesSelector-selectAllButton`)
      );
      rerenderWithLatestProps();

      expect(formProps.item.tags).toEqual([
        buildPerPolicyTag('policy-1'),
        buildPerPolicyTag('policy-2'),
      ]);
    });
  });
});
