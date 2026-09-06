/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import React from 'react';
import { CUSTOM_YARA_SIGNATURES_PATH } from '../../../../../common/constants';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { CustomYaraSignaturesList } from './custom_yara_signatures_list';
import { exceptionsListAllHttpMocks } from '../../../mocks/exceptions_list_http_mocks';
import { SEARCHABLE_FIELDS } from '../constants';
import { parseQueryFilterToKQL } from '../../../common/utils';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import type { EndpointPrivileges } from '../../../../../common/endpoint/types';

jest.mock('../../../../common/components/user_privileges');
const mockUserPrivileges = useUserPrivileges as jest.Mock;

describe('When on the custom YARA signatures page', () => {
  let user: UserEvent;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof exceptionsListAllHttpMocks>;
  let mockedEndpointPrivileges: Partial<EndpointPrivileges>;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedContext = createAppRootMockRenderer();
    mockedContext.setExperimentalFlag({ customYaraSignaturesEnabled: true });
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<CustomYaraSignaturesList />));

    apiMocks = exceptionsListAllHttpMocks(mockedContext.coreStart.http);

    act(() => {
      history.push(CUSTOM_YARA_SIGNATURES_PATH);
    });

    mockedEndpointPrivileges = {
      canManageGlobalArtifacts: true,
      canWriteCustomYaraSignatures: true,
    };
    mockUserPrivileges.mockReturnValue({ endpointPrivileges: mockedEndpointPrivileges });
  });

  afterEach(() => {
    mockUserPrivileges.mockReset();
  });

  it('should search using expected exception item fields', async () => {
    const expectedFilterString = parseQueryFilterToKQL('fooFooFoo', SEARCHABLE_FIELDS);
    const { getByTestId } = render();

    await waitFor(() => {
      expect(getByTestId('customYaraSignaturesList-simpleTable')).toBeInTheDocument();
    });

    apiMocks.responseProvider.exceptionsFind.mockClear();
    await user.click(renderResult.getByTestId('searchField'));
    await user.paste('fooFooFoo');
    await user.click(renderResult.getByTestId('searchButton'));
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

  it('should not render when feature flag is disabled', async () => {
    mockedContext.setExperimentalFlag({ customYaraSignaturesEnabled: false });
    const { queryByTestId } = render();
    await waitFor(() => {
      expect(queryByTestId('customYaraSignaturesList')).toBeNull();
    });
  });

  describe('RBAC Custom YARA Signatures', () => {
    describe('ALL privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteCustomYaraSignatures = true;
      });

      it('should enable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('customYaraSignaturesList-pageAddButton')).toBeTruthy()
        );
      });
    });

    describe('READ privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteCustomYaraSignatures = false;
      });

      it('should disable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('customYaraSignaturesList-container')).toBeTruthy()
        );

        expect(renderResult.queryByTestId('customYaraSignaturesList-pageAddButton')).toBeNull();
      });
    });
  });
});
