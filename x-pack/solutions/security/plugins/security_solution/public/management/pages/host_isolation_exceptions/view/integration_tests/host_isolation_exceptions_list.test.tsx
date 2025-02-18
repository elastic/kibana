/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../../common/constants';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { HostIsolationExceptionsList } from '../host_isolation_exceptions_list';
import { exceptionsListAllHttpMocks } from '../../../../mocks/exceptions_list_http_mocks';
import { SEARCHABLE_FIELDS } from '../../constants';
import { parseQueryFilterToKQL } from '../../../../common/utils';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../../common/components/user_privileges/__mocks__';
import { getFirstCard } from '../../../../components/artifact_list_page/mocks';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';

jest.mock('../../../../../common/components/user_privileges');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

const prepareTest = () => {
  // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
  const mockedContext = createAppRootMockRenderer();
  const { history } = mockedContext;
  const renderResult = mockedContext.render(<HostIsolationExceptionsList />);

  const apiMocks = exceptionsListAllHttpMocks(mockedContext.coreStart.http);

  act(() => {
    history.push(HOST_ISOLATION_EXCEPTIONS_PATH);
  });

  return { apiMocks, renderResult, user };
};

describe('When on the host isolation exceptions page', () => {
  const pageTestId = 'hostIsolationExceptionsListPage';

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should search using expected exception item fields', async () => {
    const expectedFilterString = parseQueryFilterToKQL('fooFooFoo', SEARCHABLE_FIELDS);
    const { renderResult, apiMocks, user } = prepareTest();
    const { getAllByTestId } = renderResult;

    await waitFor(() => {
      expect(getAllByTestId(`${pageTestId}-card`)).toHaveLength(10);
    });

    apiMocks.responseProvider.exceptionsFind.mockClear();

    await user.type(renderResult.getByTestId('searchField'), 'fooFooFoo');
    act(() => {
      fireEvent.click(renderResult.getByTestId('searchButton'));
    });

    await waitFor(() => {
      expect(apiMocks.responseProvider.exceptionsFind).toHaveBeenCalled();
    });

    expect(apiMocks.responseProvider.exceptionsFind).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          filter: expectedFilterString,
        }),
      })
    );
  });

  describe('RBAC + licensing', () => {
    describe('ALL privilege', () => {
      beforeEach(() => {
        useUserPrivilegesMock.mockReturnValue({
          endpointPrivileges: getEndpointAuthzInitialStateMock(),
        });
      });

      it('should allow the Create action', async () => {
        const { renderResult } = prepareTest();
        const { queryByTestId } = renderResult;

        await waitFor(() => expect(queryByTestId(`${pageTestId}-pageAddButton`)).toBeTruthy());
      });

      it('should allow the Edit and Delete actions', async () => {
        const { renderResult, user } = prepareTest();
        const { getByTestId } = renderResult;

        await getFirstCard(user, renderResult, {
          showActions: true,
          testId: 'hostIsolationExceptionsListPage',
        });

        expect(getByTestId(`${pageTestId}-card-cardEditAction`)).toBeTruthy();
        expect(getByTestId(`${pageTestId}-card-cardDeleteAction`)).toBeTruthy();
      });
    });

    describe('READ privilege', () => {
      beforeEach(() => {
        useUserPrivilegesMock.mockReturnValue({
          endpointPrivileges: getEndpointAuthzInitialStateMock({
            canWriteHostIsolationExceptions: false,
            canDeleteHostIsolationExceptions: false,
          }),
        });
      });

      it('should disable the Create action', async () => {
        const { renderResult } = prepareTest();
        const { queryByTestId } = renderResult;

        await waitFor(() => expect(queryByTestId(`${pageTestId}-container`)).toBeTruthy());

        expect(queryByTestId(`${pageTestId}-pageAddButton`)).toBeNull();
      });

      it('should disable the Edit and Delete actions', async () => {
        const { renderResult } = prepareTest();
        const { queryByTestId } = renderResult;

        await waitFor(() => expect(queryByTestId(`${pageTestId}-container`)).toBeTruthy());

        expect(queryByTestId(`${pageTestId}-card-header-actions-button`)).toBeNull();
      });
    });

    describe('ALL privilege and license downgrade situation', () => {
      // Use case: license downgrade scenario, where user still has entries defined, but no longer
      // able to create or edit them, only delete them

      beforeEach(() => {
        useUserPrivilegesMock.mockReturnValue({
          endpointPrivileges: getEndpointAuthzInitialStateMock({
            canWriteHostIsolationExceptions: false,
            canReadHostIsolationExceptions: true,
            canDeleteHostIsolationExceptions: true,
          }),
        });
      });

      it('should hide the Create and Edit actions when host isolation exceptions write authz is not allowed, but HIE entries exist', async () => {
        const { renderResult, user } = prepareTest();
        const { getAllByTestId, queryByTestId, getByTestId } = await renderResult;

        await waitFor(() => {
          expect(getAllByTestId(`${pageTestId}-card`)).toHaveLength(10);
        });
        await getFirstCard(user, renderResult, {
          showActions: true,
          testId: 'hostIsolationExceptionsListPage',
        });

        expect(queryByTestId(`${pageTestId}-pageAddButton`)).toBeNull();
        expect(getByTestId(`${pageTestId}-card-cardDeleteAction`)).toBeTruthy();
        expect(queryByTestId(`${pageTestId}-card-cardEditAction`)).toBeNull();
      });

      it('should allow Delete action', async () => {
        const { apiMocks, renderResult, user } = prepareTest();
        const { getAllByTestId, getByTestId } = await renderResult;

        await waitFor(() => {
          expect(getAllByTestId(`${pageTestId}-card`)).toHaveLength(10);
        });
        await getFirstCard(user, renderResult, {
          showActions: true,
          testId: 'hostIsolationExceptionsListPage',
        });

        const deleteButton = getByTestId(`${pageTestId}-card-cardDeleteAction`);
        expect(deleteButton).toBeTruthy();

        await user.click(deleteButton);
        const confirmDeleteButton = getByTestId(`${pageTestId}-deleteModal-submitButton`);
        await user.click(confirmDeleteButton);
        await waitFor(() => {
          expect(apiMocks.responseProvider.exceptionDelete).toHaveReturnedWith(
            expect.objectContaining({
              namespace_type: 'agnostic',
              os_types: ['windows'],
              tags: ['policy:all'],
            })
          );
        });
      });
    });
  });
});
