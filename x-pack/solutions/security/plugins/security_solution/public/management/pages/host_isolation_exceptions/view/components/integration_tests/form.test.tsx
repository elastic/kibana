/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { HostIsolationExceptionsList } from '../../host_isolation_exceptions_list';
import { act, waitFor } from '@testing-library/react';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../../../common/constants';
import { allFleetHttpMocks, exceptionsListAllHttpMocks } from '../../../../../mocks';
import type { HttpFetchOptionsWithPath, IHttpFetchError } from '@kbn/core/public';
import { testIdPrefix } from '../form';
import { buildPerPolicyTag } from '../../../../../../../common/endpoint/service/artifacts/utils';
import { policySelectorMocks } from '../../../../../components/policy_selector/mocks';

jest.mock('../../../../../../common/components/user_privileges');

describe('When on the host isolation exceptions entry form', () => {
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let exceptionsApiMock: ReturnType<typeof exceptionsListAllHttpMocks>;
  let fleetApiMock: ReturnType<typeof allFleetHttpMocks>;

  const formRowHasError = (testId: string): boolean => {
    const formRow = renderResult.getByTestId(testId);

    return formRow.querySelector('.euiFormErrorText') !== null;
  };

  const submitButtonDisabledState = (): boolean => {
    return (
      renderResult.getByTestId(
        'hostIsolationExceptionsListPage-flyout-submitButton'
      ) as HTMLButtonElement
    ).disabled;
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = async () => {
      renderResult = mockedContext.render(<HostIsolationExceptionsList />);

      await waitFor(async () => {
        await expect(
          renderResult.findAllByTestId('hostIsolationExceptionsListPage-card')
        ).resolves.toHaveLength(10);
      });

      await userEvent.click(
        renderResult.getByTestId('hostIsolationExceptionsListPage-pageAddButton')
      );

      await waitFor(() => {
        expect(renderResult.getByTestId('hostIsolationExceptions-form')).toBeTruthy();
      });

      return renderResult;
    };

    exceptionsApiMock = exceptionsListAllHttpMocks(mockedContext.coreStart.http);
    fleetApiMock = allFleetHttpMocks(mockedContext.coreStart.http);

    act(() => {
      history.push(HOST_ISOLATION_EXCEPTIONS_PATH);
    });
  });

  describe('and creating a new exception', () => {
    beforeEach(async () => {
      await render();
    });

    it('should render the form with empty inputs', () => {
      expect(renderResult.getByTestId('hostIsolationExceptions-form-name-input')).toHaveValue('');
      expect(renderResult.getByTestId('hostIsolationExceptions-form-ip-input')).toHaveValue('');
      expect(
        renderResult.getByTestId('hostIsolationExceptions-form-description-input')
      ).toHaveValue('');
    });

    it('should keep submit button disabled if only the name is entered', async () => {
      const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');

      await userEvent.type(nameInput, 'test name');
      await userEvent.click(
        renderResult.getByTestId('hostIsolationExceptions-form-description-input')
      );

      await waitFor(() => {
        expect(submitButtonDisabledState()).toBe(true);
      });
    });

    it.each([['not an ip'], ['100'], ['900.0.0.1'], ['x.x.x.x'], ['10.0.0']])(
      'should show validation error when a wrong ip value is entered. Case: "%s"',
      async (value: string) => {
        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');

        await userEvent.type(ipInput, value);
        await userEvent.click(
          renderResult.getByTestId('hostIsolationExceptions-form-description-input')
        );

        await waitFor(() => {
          expect(formRowHasError('hostIsolationExceptions-form-ip-input-formRow')).toBe(true);
          expect(submitButtonDisabledState()).toBe(true);
        });
      }
    );

    it.each([['192.168.0.1'], ['10.0.0.1'], ['100.90.1.1/24'], ['192.168.200.6/30']])(
      'should NOT show validation error when a correct ip value is entered. Case: "%s"',
      async (value: string) => {
        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
        const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');

        await userEvent.type(nameInput, 'test name');
        await userEvent.type(ipInput, value);

        expect(formRowHasError('hostIsolationExceptions-form-ip-input-formRow')).toBe(false);

        await waitFor(() => {
          expect(submitButtonDisabledState()).toBe(false);
        });
      }
    );

    it('should select the "global" policy by default', () => {
      expect(
        renderResult
          .getByTestId(`${testIdPrefix}-effectedPolicies-global`)
          .classList.contains('euiButtonGroupButton-isSelected')
      ).toBe(true);
    });
  });

  describe('and editing an existing exception with global policy', () => {
    let existingException: ExceptionListItemSchema;

    beforeEach(() => {
      const generateExceptionsFindResponse =
        exceptionsApiMock.responseProvider.exceptionsFind.getMockImplementation()!;

      existingException = exceptionsApiMock.responseProvider.exceptionsFind({
        query: {},
      } as HttpFetchOptionsWithPath).data[0];

      Object.assign(existingException, {
        name: 'name edit me',
        description: 'initial description',
        item_id: '123-321',
        tags: ['policy:all'],
        entries: [
          {
            field: 'destination.ip',
            operator: 'included',
            type: 'match',
            value: '10.0.0.1',
          },
        ],
      });

      exceptionsApiMock.responseProvider.exceptionsFind.mockImplementation((options) => {
        const response: FoundExceptionListItemSchema = generateExceptionsFindResponse(options);
        response.data[0] = existingException;

        return response;
      });

      exceptionsApiMock.responseProvider.exceptionGetOne.mockImplementation(() => {
        return existingException;
      });

      act(() => {
        history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?itemId=123-321&show=edit`);
      });
    });

    it('should render the form with pre-filled inputs', async () => {
      await render();
      expect(renderResult.getByTestId('hostIsolationExceptions-form-name-input')).toHaveValue(
        'name edit me'
      );
      expect(renderResult.getByTestId('hostIsolationExceptions-form-ip-input')).toHaveValue(
        '10.0.0.1'
      );
      expect(
        renderResult.getByTestId('hostIsolationExceptions-form-description-input')
      ).toHaveValue('initial description');
    });

    it('should update field with new value', async () => {
      await render();
      const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
      await userEvent.clear(ipInput);
      await userEvent.type(ipInput, '10.0.100.1');

      expect(
        (renderResult.getByTestId('hostIsolationExceptions-form-ip-input') as HTMLInputElement)
          .value
      ).toBe('10.0.100.1');
    });

    it('should show global pre-selected', async () => {
      await render();

      expect(
        renderResult
          .getByTestId(`${testIdPrefix}-effectedPolicies-global`)
          .classList.contains('euiButtonGroupButton-isSelected')
      ).toBe(true);
    });

    it('should show pre-selected policies', async () => {
      const policyApiResponse = fleetApiMock.responseProvider.packagePolicies();
      const policyId1 = policyApiResponse.items[0].id;
      const policyId2 = policyApiResponse.items[1].id;

      existingException.tags = [buildPerPolicyTag(policyId1), buildPerPolicyTag(policyId2)];

      await render();
      const policySelector = policySelectorMocks.getTestHelpers(
        `${testIdPrefix}-effectedPolicies-policiesSelector`,
        renderResult
      );

      await waitFor(() => {
        expect(renderResult.getByTestId('hostIsolationExceptionsListPage-flyout'));
      });

      await policySelector.waitForDataToLoad();

      expect(policySelector.isPolicySelected(policyId1)).toEqual(true);
      expect(policySelector.isPolicySelected(policyId2)).toEqual(true);
    });

    it('should show the policies selector when no policy is selected', async () => {
      existingException.tags = [];
      await render();

      expect(
        renderResult.queryByTestId(`${testIdPrefix}-effectedPolicies-policiesSelector`)
      ).toBeTruthy();
    });

    // FIXME:PT not sure why this test is not working but I have spent several hours now on it and can't
    //          figure it out. Skipping for now and will try to come back to it.
    it.skip('should display form submission errors', async () => {
      const error = new Error('oh oh - error') as IHttpFetchError;
      exceptionsApiMock.responseProvider.exceptionUpdate.mockImplementation(() => {
        throw error;
      });

      const { getByTestId } = await render();
      await userEvent.click(getByTestId('hostIsolationExceptionsListPage-flyout-submitButton'));

      await waitFor(() => {
        expect(exceptionsApiMock.responseProvider.exceptionUpdate).toHaveBeenCalled();
      });

      expect(getByTestId('hostIsolationExceptions-form-submitError').textContent).toMatch(
        'oh oh - error'
      );
    });
  });
});
