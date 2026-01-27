/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import React from 'react';
import { ENDPOINT_EXCEPTIONS_PATH } from '../../../../../common/constants';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { EndpointExceptions } from './endpoint_exceptions';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';

jest.mock('../../../../common/components/user_privileges');
const mockUserPrivileges = useUserPrivileges as jest.Mock;

describe('When on the endpoint exceptions page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<EndpointExceptions />));

    act(() => {
      history.push(ENDPOINT_EXCEPTIONS_PATH);
    });
  });

  afterEach(() => {
    mockUserPrivileges.mockReset();
  });

  describe('And no data exists', () => {
    it('should show the Empty message', async () => {
      render();
      await waitFor(() =>
        expect(renderResult.getByTestId('endpointExceptionsListPage-emptyState')).toBeTruthy()
      );
    });
  });

  describe('RBAC Endpoint Exceptions', () => {
    describe('ALL privilege', () => {
      beforeEach(() => {
        mockUserPrivileges.mockReturnValue({
          endpointPrivileges: getEndpointAuthzInitialStateMock({
            canWriteEndpointExceptions: true,
          }),
        });
      });

      it('should enable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(
            renderResult.queryByTestId('endpointExceptionsListPage-emptyState-addButton')
          ).toBeTruthy()
        );
      });
    });

    describe('READ privilege', () => {
      beforeEach(() => {
        mockUserPrivileges.mockReturnValue({
          endpointPrivileges: getEndpointAuthzInitialStateMock({
            canWriteEndpointExceptions: false,
          }),
        });
      });

      it('should disable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('endpointExceptionsListPage-container')).toBeTruthy()
        );

        expect(
          renderResult.queryByTestId('endpointExceptionsListPage-emptyState-addButton')
        ).toBeNull();
      });
    });
  });
});
