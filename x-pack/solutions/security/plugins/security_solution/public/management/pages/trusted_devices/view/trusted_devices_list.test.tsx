/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { TRUSTED_DEVICES_PATH } from '../../../../../common/constants';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { TrustedDevicesList } from './trusted_devices_list';
import { exceptionsListAllHttpMocks } from '../../../mocks/exceptions_list_http_mocks';
import { SEARCHABLE_FIELDS } from '../constants';
import { parseQueryFilterToKQL } from '../../../common/utils';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import type { EndpointPrivileges } from '../../../../../common/endpoint/types';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

jest.mock('../../../../common/hooks/use_experimental_features');

jest.mock('../../../../common/components/user_privileges');
const mockUserPrivileges = useUserPrivileges as jest.Mock;

describe('When on the trusted devices page', () => {
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
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<TrustedDevicesList />));

    apiMocks = exceptionsListAllHttpMocks(mockedContext.coreStart.http);

    act(() => {
      history.push(TRUSTED_DEVICES_PATH);
    });

    mockedEndpointPrivileges = {
      canManageGlobalArtifacts: true,
      canWriteTrustedDevices: true,
    };
    mockUserPrivileges.mockReturnValue({ endpointPrivileges: mockedEndpointPrivileges });
  });

  afterEach(() => {
    mockUserPrivileges.mockReset();
  });

  it('should search using expected exception item fields', async () => {
    const expectedFilterString = parseQueryFilterToKQL('fooFooFoo', SEARCHABLE_FIELDS);
    const { getAllByTestId } = render();

    await waitFor(async () => {
      expect(getAllByTestId('trustedDevicesList-card')).toHaveLength(10);
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
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    const { queryByTestId } = render();
    await waitFor(() => {
      expect(queryByTestId('trustedDevicesList')).toBeNull();
    });
  });

  describe('RBAC Trusted Devices', () => {
    describe('ALL privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteTrustedDevices = true;
      });

      it('should enable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('trustedDevicesList-pageAddButton')).toBeTruthy()
        );
      });

      it('should enable modifying/deleting entries', async () => {
        render();

        const actionsButton = await waitFor(
          () => renderResult.getAllByTestId('trustedDevicesList-card-header-actions-button')[0]
        );
        await user.click(actionsButton);
        await waitForEuiPopoverOpen();

        expect(
          await renderResult.findByTestId('trustedDevicesList-card-cardEditAction')
        ).toBeTruthy();
        expect(
          await renderResult.findByTestId('trustedDevicesList-card-cardDeleteAction')
        ).toBeTruthy();
      });
    });

    describe('READ privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteTrustedDevices = false;
      });

      it('should disable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('trustedDevicesList-container')).toBeTruthy()
        );

        expect(renderResult.queryByTestId('trustedDevicesList-pageAddButton')).toBeNull();
      });

      it('should disable modifying/deleting entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('trustedDevicesList-container')).toBeTruthy()
        );

        expect(
          renderResult.queryByTestId('trustedDevicesList-card-header-actions-button')
        ).toBeNull();
      });
    });
  });
});
