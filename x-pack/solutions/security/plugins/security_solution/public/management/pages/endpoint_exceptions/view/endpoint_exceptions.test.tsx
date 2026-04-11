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
import { exceptionsListAllHttpMocks } from '../../../mocks';
import { endpointExceptionsPerPolicyOptInAllHttpMocks } from '../../../mocks/endpoint_per_policy_opt_in_http_mocks';
import userEvent from '@testing-library/user-event';

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
    mockedContext.setExperimentalFlag({ endpointExceptionsMovedUnderManagement: true });

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
        expect(
          renderResult.getByTestId('endpointExceptionsListPage-emptyState')
        ).toBeInTheDocument()
      );
    });
  });

  describe('RBAC Endpoint Exceptions', () => {
    describe('ALL privilege', () => {
      beforeEach(() => {
        mockUserPrivileges.mockReturnValue({
          endpointPrivileges: getEndpointAuthzInitialStateMock({
            canWriteEndpointExceptions: true,
            canWriteAdminData: false,
          }),
        });
      });

      it('should enable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(
            renderResult.queryByTestId('endpointExceptionsListPage-emptyState-addButton')
          ).toBeInTheDocument()
        );
      });
    });

    describe('READ privilege', () => {
      beforeEach(() => {
        mockUserPrivileges.mockReturnValue({
          endpointPrivileges: getEndpointAuthzInitialStateMock({
            canWriteEndpointExceptions: false,
            canWriteAdminData: false,
          }),
        });
      });

      it('should disable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(
            renderResult.queryByTestId('endpointExceptionsListPage-container')
          ).toBeInTheDocument()
        );

        expect(
          renderResult.queryByTestId('endpointExceptionsListPage-emptyState-addButton')
        ).toBeNull();
      });
    });
  });

  describe('When opting in to per-policy Endpoint exceptions', () => {
    const CALLOUT = 'endpointExceptionsPerPolicyOptInCallout';
    const MODAL = 'endpointExceptionsPerPolicyOptInModal';
    const STORAGE_KEY = 'endpointExceptionsPerPolicyOptInCalloutDismissed';
    const UPDATE_DETAILS_BTN = 'updateDetailsEndpointExceptionsPerPolicyOptInButton';
    const CANCEL_BTN = 'cancelEndpointExceptionsPerPolicyOptInButton';
    const CONFIRM_BTN = 'confirmEndpointExceptionsPerPolicyOptInButton';
    const MENU_BTN = 'endpointExceptionsListPage-overflowMenuButtonIcon';
    const UPDATE_TO_PER_POLICY_ACTION_BTN =
      'endpointExceptionsListPage-overflowMenuActionItemperPolicyOptInActionMenuItem';

    let optInGetMock: ReturnType<
      typeof endpointExceptionsPerPolicyOptInAllHttpMocks
    >['responseProvider']['optInGet'];

    let optInSendMock: ReturnType<
      typeof endpointExceptionsPerPolicyOptInAllHttpMocks
    >['responseProvider']['optInSend'];

    beforeEach(() => {
      const perPolicyOptInMocks = endpointExceptionsPerPolicyOptInAllHttpMocks(
        mockedContext.coreStart.http
      );
      optInGetMock = perPolicyOptInMocks.responseProvider.optInGet;
      optInSendMock = perPolicyOptInMocks.responseProvider.optInSend;

      mockUserPrivileges.mockReturnValue({
        endpointPrivileges: getEndpointAuthzInitialStateMock({
          canWriteEndpointExceptions: true,
          canWriteAdminData: true,
        }),
      });
    });

    describe('when there are no exceptions', () => {
      it('should not show the per-policy opt-in callout', async () => {
        render();

        expect(renderResult.queryByTestId(CALLOUT)).toBeNull();
      });
    });

    describe('when there are exceptions', () => {
      beforeEach(() => {
        exceptionsListAllHttpMocks(mockedContext.coreStart.http);
      });

      describe('when showing the callout or not', () => {
        it('should show the per-policy opt-in callout by default', async () => {
          render();

          await waitFor(() => expect(optInGetMock).toHaveBeenCalled());
          expect(renderResult.queryByTestId(CALLOUT)).toBeTruthy();
        });

        it('should not show the per-policy opt-in below Platinum license', async () => {
          mockUserPrivileges.mockReturnValue({
            endpointPrivileges: getEndpointAuthzInitialStateMock({
              canCreateArtifactsByPolicy: false,
            }),
          });

          render();

          await waitFor(() => expect(optInGetMock).toHaveBeenCalled());
          expect(renderResult.queryByTestId(CALLOUT)).not.toBeInTheDocument();
        });

        it('should hide the per-policy opt-in callout after dismissing it and store the dismissal in session storage', async () => {
          render();

          expect(mockedContext.startServices.sessionStorage.get(STORAGE_KEY)).toEqual(null);

          await waitFor(() => expect(optInGetMock).toHaveBeenCalled());

          await userEvent.click(
            renderResult
              .getByTestId(CALLOUT)
              .querySelector('[data-test-subj="euiDismissCalloutButton"]')!
          );

          expect(renderResult.queryByTestId(CALLOUT)).not.toBeInTheDocument();
          expect(mockedContext.startServices.sessionStorage.get(STORAGE_KEY)).toEqual(true);
        });

        it('should not show the per-policy callout if the dismissal is stored in session storage', async () => {
          mockedContext.startServices.sessionStorage.set(STORAGE_KEY, true);

          render();

          await waitFor(() => expect(optInGetMock).toHaveBeenCalled());
          expect(renderResult.queryByTestId(CALLOUT)).not.toBeInTheDocument();
        });

        it('should not show the callout after user opted in', async () => {
          optInGetMock.mockReturnValue({ status: true });

          render();

          await waitFor(() => expect(optInGetMock).toHaveBeenCalled());
          expect(renderResult.queryByTestId(CALLOUT)).not.toBeInTheDocument();
        });
      });

      describe('when using the opt-in action menu item', () => {
        it('should show the opt-in menu action even when the callout is dismissed', async () => {
          mockedContext.startServices.sessionStorage.set(STORAGE_KEY, true);

          render();

          await waitFor(() => expect(optInGetMock).toHaveBeenCalled());
          await waitFor(() => userEvent.click(renderResult.getByTestId(MENU_BTN)));

          expect(renderResult.queryByTestId(UPDATE_TO_PER_POLICY_ACTION_BTN)).toBeInTheDocument();
          expect(renderResult.queryByTestId(CALLOUT)).not.toBeInTheDocument();
        });

        it('should not show the opt-in menu action below Platinum license', async () => {
          mockUserPrivileges.mockReturnValue({
            endpointPrivileges: getEndpointAuthzInitialStateMock({
              canCreateArtifactsByPolicy: false,
            }),
          });

          render();

          await waitFor(() => expect(optInGetMock).toHaveBeenCalled());
          expect(
            renderResult.queryByTestId(UPDATE_TO_PER_POLICY_ACTION_BTN)
          ).not.toBeInTheDocument();
        });

        it('should show the per-policy opt-in modal when clicking on the action menu item', async () => {
          render();

          await waitFor(() => userEvent.click(renderResult.getByTestId(MENU_BTN)));
          await waitFor(() =>
            userEvent.click(renderResult.getByTestId(UPDATE_TO_PER_POLICY_ACTION_BTN))
          );

          expect(renderResult.queryByTestId(MODAL)).toBeInTheDocument();
        });

        it('should hide the per-policy opt-in modal when already opted in', async () => {
          optInGetMock.mockReturnValue({ status: true });

          render();

          await waitFor(() => userEvent.click(renderResult.getByTestId(MENU_BTN)));

          expect(
            renderResult.queryByTestId(UPDATE_TO_PER_POLICY_ACTION_BTN)
          ).not.toBeInTheDocument();
        });
      });

      describe('when showing the opt-in modal', () => {
        it('should show the modal when clicking on the update details button', async () => {
          render();
          await waitFor(() => userEvent.click(renderResult.getByTestId(UPDATE_DETAILS_BTN)));

          expect(renderResult.queryByTestId(MODAL)).toBeInTheDocument();
        });

        it('should hide the modal when clicking on the cancel button', async () => {
          render();
          await waitFor(() => userEvent.click(renderResult.getByTestId(UPDATE_DETAILS_BTN)));
          await waitFor(() => userEvent.click(renderResult.getByTestId(CANCEL_BTN)));

          expect(renderResult.queryByTestId(MODAL)).not.toBeInTheDocument();
        });

        it('should call the opt-in API and show a success toast when clicking on the confirm button', async () => {
          render();
          await waitFor(() => userEvent.click(renderResult.getByTestId(UPDATE_DETAILS_BTN)));
          await waitFor(() => userEvent.click(renderResult.getByTestId(CONFIRM_BTN)));

          expect(optInSendMock).toHaveBeenCalled();
          expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
            title: 'Updated to policy-based exceptions',
            text: 'You can now apply your endpoint exceptions on a policy basis.',
          });
          expect(renderResult.queryByTestId(MODAL)).not.toBeInTheDocument();
        });

        it('should disable the buttons while the opt-in API call is in-flight', async () => {
          let finishRequest: (_?: unknown) => void = () => {};
          optInSendMock.mockImplementation(
            () => new Promise((resolve) => (finishRequest = resolve))
          );

          render();
          await waitFor(() => userEvent.click(renderResult.getByTestId(UPDATE_DETAILS_BTN)));
          await waitFor(() => userEvent.click(renderResult.getByTestId(CONFIRM_BTN)));

          expect(renderResult.getByTestId(CONFIRM_BTN)).toBeDisabled();
          expect(renderResult.getByTestId(CANCEL_BTN)).toBeDisabled();

          act(() => {
            finishRequest();
          });

          await waitFor(() => expect(renderResult.queryByTestId(MODAL)).not.toBeInTheDocument());
        });

        it('should show an error toast when the opt-in API call fails', async () => {
          optInSendMock.mockImplementation(() => Promise.reject(new Error('Error message')));

          render();
          await waitFor(() => userEvent.click(renderResult.getByTestId(UPDATE_DETAILS_BTN)));
          await waitFor(() => userEvent.click(renderResult.getByTestId(CONFIRM_BTN)));

          expect(optInSendMock).toHaveBeenCalled();
          expect(mockedContext.coreStart.notifications.toasts.addError).toHaveBeenCalledWith(
            new Error('Error message'),
            { title: 'Error updating to policy-based exceptions' }
          );
          expect(renderResult.queryByTestId(MODAL)).toBeInTheDocument();
        });
      });

      describe('RBAC', () => {
        describe('when user has the `canWriteAdminData` privilege', () => {
          beforeEach(() => {
            mockUserPrivileges.mockReturnValue({
              endpointPrivileges: getEndpointAuthzInitialStateMock({
                canWriteEndpointExceptions: true,
                canWriteAdminData: true,
              }),
            });
          });

          it('should show the update details button', async () => {
            render();

            await waitFor(() => {
              expect(renderResult.queryByTestId(CALLOUT)).toBeInTheDocument();
              expect(renderResult.queryByTestId(UPDATE_DETAILS_BTN)).toBeInTheDocument();
            });
          });

          it('should show the opt in menu action', async () => {
            render();

            await waitFor(() => userEvent.click(renderResult.getByTestId(MENU_BTN)));

            await waitFor(() => {
              expect(
                renderResult.queryByTestId(UPDATE_TO_PER_POLICY_ACTION_BTN)
              ).toBeInTheDocument();
            });
          });
        });

        describe('when user does not have the `canWriteAdminData` privilege', () => {
          beforeEach(() => {
            mockUserPrivileges.mockReturnValue({
              endpointPrivileges: getEndpointAuthzInitialStateMock({
                canWriteEndpointExceptions: true,
                canWriteAdminData: false,
              }),
            });
          });

          it('should show "Contact your admin" instead of the update details button', async () => {
            render();

            await waitFor(() => {
              expect(renderResult.queryByTestId(CALLOUT)).toBeInTheDocument();
              expect(
                renderResult.queryByText(/Contact your administrator to update details/)
              ).toBeInTheDocument();
              expect(renderResult.queryByTestId(UPDATE_DETAILS_BTN)).not.toBeInTheDocument();
            });
          });

          it('should not show the opt in menu action', async () => {
            render();

            await waitFor(() => userEvent.click(renderResult.getByTestId(MENU_BTN)));

            await waitFor(() => {
              expect(
                renderResult.queryByTestId(UPDATE_TO_PER_POLICY_ACTION_BTN)
              ).not.toBeInTheDocument();
            });
          });
        });
      });
    });
  });
});
