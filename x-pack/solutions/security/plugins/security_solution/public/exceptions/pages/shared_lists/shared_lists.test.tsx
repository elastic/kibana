/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../common/mock';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';

import { SharedLists } from '.';
import { useApi, useExceptionLists } from '@kbn/securitysolution-list-hooks';
import { useAllExceptionLists } from '../../hooks/use_all_exception_lists';
import { useHistory } from 'react-router-dom';
import { generateHistoryMock } from '../../../common/utils/route/mocks';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../common/components/user_privileges/user_privileges_context';
import { useEndpointExceptionsCapability } from '../../hooks/use_endpoint_exceptions_capability';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-exceptions-common/api';
import { useGetEndpointExceptionsPerPolicyOptIn } from '../../../management/hooks/artifacts/use_endpoint_per_policy_opt_in';
import type { OptInStatusMetadata } from '../../../../server/endpoint/lib/reference_data';

jest.mock('../../../common/components/user_privileges');
jest.mock('../../../common/utils/route/mocks');
jest.mock('../../hooks/use_all_exception_lists');
jest.mock('@kbn/securitysolution-list-hooks');
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useHistory: jest.fn(),
  };
});
jest.mock('@kbn/i18n-react', () => {
  const { i18n } = jest.requireActual('@kbn/i18n');
  i18n.init({ locale: 'en' });

  const originalModule = jest.requireActual('@kbn/i18n-react');
  const FormattedRelative = jest.fn();
  FormattedRelative.mockImplementationOnce(() => '2 days ago');
  FormattedRelative.mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});

jest.mock('../../../detections/containers/detection_engine/lists/use_lists_config', () => ({
  useListsConfig: jest.fn().mockReturnValue({ loading: false }),
}));

jest.mock('@kbn/cps-utils', () => ({
  useRouteBasedCpsPickerAccess: jest.fn(),
  ProjectRoutingAccess: { READONLY: 'readonly' },
}));

jest.mock('../../hooks/use_endpoint_exceptions_capability');
jest.mock('../../components/create_shared_exception_list', () => ({
  CreateSharedListFlyout: ({ handleCloseFlyout }: { handleCloseFlyout: () => void }) => (
    <div data-test-subj="createSharedExceptionListFlyout">
      <button type="button" data-test-subj="closeFlyoutButton" onClick={handleCloseFlyout}>
        {'Close'}
      </button>
    </div>
  ),
}));

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../management/hooks/artifacts/use_endpoint_per_policy_opt_in');
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const mockUseGetEndpointExceptionsPerPolicyOptIn =
  useGetEndpointExceptionsPerPolicyOptIn as jest.Mock;

describe('SharedLists', () => {
  const mockHistory = generateHistoryMock();
  const exceptionList1 = getExceptionListSchemaMock();
  const exceptionList2 = { ...getExceptionListSchemaMock(), list_id: 'not_endpoint_list', id: '2' };

  beforeAll(() => {
    (useHistory as jest.Mock).mockReturnValue(mockHistory);
  });

  beforeEach(() => {
    (useApi as jest.Mock).mockReturnValue({
      deleteExceptionList: jest.fn(),
      exportExceptionList: jest.fn(),
    });

    (useExceptionLists as jest.Mock).mockReturnValue([
      false,
      [exceptionList1, exceptionList2],
      {
        page: 1,
        perPage: 20,
        total: 2,
      },
      jest.fn(),
    ]);

    (useAllExceptionLists as jest.Mock).mockReturnValue([
      false,
      [
        { ...exceptionList1, rules: [] },
        { ...exceptionList2, rules: [] },
      ],
      {
        not_endpoint_list: exceptionList2,
        endpoint_list: exceptionList1,
      },
    ]);

    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
    });

    (useEndpointExceptionsCapability as jest.Mock).mockReturnValue(true);

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    mockUseGetEndpointExceptionsPerPolicyOptIn.mockReturnValue({ data: { status: false } });
  });

  it('renders empty view if no lists exist', async () => {
    (useExceptionLists as jest.Mock).mockReturnValue([
      false,
      [],
      {
        page: 1,
        perPage: 20,
        total: 0,
      },
      jest.fn(),
    ]);

    (useAllExceptionLists as jest.Mock).mockReturnValue([false, [], {}]);
    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );

    await waitFor(() => {
      const emptyViewerState = wrapper.getByTestId('emptyViewerState');
      expect(emptyViewerState).toBeInTheDocument();
    });
  });

  it('renders loading state when fetching lists', async () => {
    (useExceptionLists as jest.Mock).mockReturnValue([
      true,
      [],
      {
        page: 1,
        perPage: 20,
        total: 0,
      },
      jest.fn(),
    ]);

    (useAllExceptionLists as jest.Mock).mockReturnValue([false, [], {}]);
    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );

    await waitFor(() => {
      const loadingViewerState = wrapper.getByTestId('loadingViewerState');
      expect(loadingViewerState).toBeInTheDocument();
    });
  });

  it('renders loading state when fetching refs', async () => {
    (useExceptionLists as jest.Mock).mockReturnValue([
      false,
      [exceptionList1, exceptionList2],
      {
        page: 1,
        perPage: 20,
        total: 2,
      },
      jest.fn(),
    ]);

    (useAllExceptionLists as jest.Mock).mockReturnValue([true, [], {}]);
    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );

    await waitFor(() => {
      const loadingViewerState = wrapper.getByTestId('loadingViewerState');
      expect(loadingViewerState).toBeInTheDocument();
    });
  });

  it('renders empty search state when no search results are found', async () => {
    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );

    (useExceptionLists as jest.Mock).mockReturnValue([
      false,
      [],
      {
        page: 1,
        perPage: 20,
        total: 0,
      },
      jest.fn(),
    ]);

    (useAllExceptionLists as jest.Mock).mockReturnValue([false, [], {}]);

    const searchBar = wrapper.getByTestId('exceptionsHeaderSearchInput');
    fireEvent.change(searchBar, { target: { value: 'foo' } });

    await waitFor(() => {
      const emptySearchViewerState = wrapper.getByTestId('emptySearchViewerState');
      expect(emptySearchViewerState).toBeInTheDocument();
    });
  });

  describe('when moving Endpoint exceptions to Management', () => {
    it('should not fetch "endpoint_list" when Endpoint exceptions moved FF is enabled', async () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        rulesPrivileges: {
          rules: { read: true, edit: true },
          exceptions: { read: true, edit: true },
        },
      });

      render(
        <TestProviders>
          <SharedLists />
        </TestProviders>
      );

      expect(useExceptionLists).toHaveBeenCalledWith(
        expect.objectContaining({
          filterOptions: expect.objectContaining({ types: [ExceptionListTypeEnum.detection] }),
          hideLists: [],
        } as Partial<Parameters<typeof useExceptionLists>[0]>)
      );
    });

    it('should display dismissible callout when FF is enabled but user has not opted in to per-policy yet', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      mockUseGetEndpointExceptionsPerPolicyOptIn.mockReturnValue({
        data: { status: false } as OptInStatusMetadata,
      });

      const { getByTestId } = render(
        <TestProviders>
          <SharedLists />
        </TestProviders>
      );

      const callout = getByTestId('EndpointExceptionsMovedCallout');
      expect(callout).toBeInTheDocument();
      expect(callout).toHaveTextContent('Endpoint exceptions have moved.');

      expect(getByTestId('euiDismissCalloutButton')).toBeTruthy();
    });

    it('should display dismissible callout when FF is enabled and user has opted in to per-policy', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      mockUseGetEndpointExceptionsPerPolicyOptIn.mockReturnValue({
        data: { status: true, reason: 'userOptedIn' } as OptInStatusMetadata,
      });

      const { getByTestId } = render(
        <TestProviders>
          <SharedLists />
        </TestProviders>
      );

      const callout = getByTestId('EndpointExceptionsMovedCallout');
      expect(callout).toBeInTheDocument();
      expect(callout).toHaveTextContent('Endpoint exceptions have moved.');

      expect(getByTestId('euiDismissCalloutButton')).toBeTruthy();
    });

    it('should NOT display dismissible callout when FF is enabled on a new deployment', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      mockUseGetEndpointExceptionsPerPolicyOptIn.mockReturnValue({
        data: { status: true, reason: 'newDeployment' } as OptInStatusMetadata,
      });

      const { queryByTestId } = render(
        <TestProviders>
          <SharedLists />
        </TestProviders>
      );

      const callout = queryByTestId('EndpointExceptionsMovedCallout');
      expect(callout).not.toBeInTheDocument();
    });

    it('should fetch "endpoint_list" but hide other endpoint artifacts when Endpoint exceptions moved FF is disabled', async () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        rulesPrivileges: {
          rules: { read: true, edit: true },
          exceptions: { read: true, edit: true },
        },
      });

      render(
        <TestProviders>
          <SharedLists />
        </TestProviders>
      );

      expect(useExceptionLists).toHaveBeenCalledWith(
        expect.objectContaining({
          filterOptions: expect.objectContaining({
            types: [ExceptionListTypeEnum.detection, ExceptionListTypeEnum.endpoint],
          }),
          hideLists: ENDPOINT_ARTIFACT_LIST_IDS.filter((id) => id !== 'endpoint_list'),
        } as Partial<Parameters<typeof useExceptionLists>[0]>)
      );
    });

    it('should not display callout when FF is disabled', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

      const { queryByTestId } = render(
        <TestProviders>
          <SharedLists />
        </TestProviders>
      );

      const callout = queryByTestId('EndpointExceptionsMovedCallout');
      expect(callout).not.toBeInTheDocument();
    });
  });

  it('renders the "endpoint_list" overflow card button as enabled when user is restricted to only READ Endpoint Exceptions', async () => {
    (useEndpointExceptionsCapability as jest.Mock).mockReturnValue(false);

    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );
    const allMenuActions = wrapper.getAllByTestId('sharedListOverflowCardButtonIcon');
    expect(allMenuActions).toHaveLength(2);
    fireEvent.click(allMenuActions[1]);

    await waitFor(() => {
      const allExportActions = wrapper.getAllByTestId('sharedListOverflowCardActionItemExport');
      expect(allExportActions[0]).toBeEnabled();
    });
  });

  it('renders delete option as disabled if list is "endpoint_list"', async () => {
    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );
    const allMenuActions = wrapper.getAllByTestId('sharedListOverflowCardButtonIcon');
    expect(allMenuActions).toHaveLength(2);
    fireEvent.click(allMenuActions[0]);

    await waitFor(() => {
      const allDeleteActions = wrapper.getAllByTestId('sharedListOverflowCardActionItemDelete');
      expect(allDeleteActions[0]).toBeDisabled();
    });
  });

  it('renders overflow card button as enabled if user is read only', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        rules: { read: true, edit: false },
        exceptions: { read: true, edit: false },
      },
    });

    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );
    const allMenuActions = wrapper.getAllByTestId('sharedListOverflowCardButtonIcon');
    expect(allMenuActions).toHaveLength(2);
    expect(allMenuActions[1]).toBeEnabled();
  });

  it('renders export option as enabled when user is restricted to only READ rules', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        rules: { read: true, edit: false },
        exceptions: { read: true, edit: false },
      },
    });

    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );
    const allMenuActions = wrapper.getAllByTestId('sharedListOverflowCardButtonIcon');
    expect(allMenuActions).toHaveLength(2);
    fireEvent.click(allMenuActions[0]);

    await waitFor(() => {
      const allExportActions = wrapper.getAllByTestId('sharedListOverflowCardActionItemExport');
      expect(allExportActions[0]).toBeEnabled();
    });
  });

  it('returns focus to the create button when the create shared list flyout is closed', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        rules: { read: true, edit: true },
        exceptions: { read: true, edit: true },
      },
    });

    const wrapper = render(
      <TestProviders>
        <SharedLists />
      </TestProviders>
    );

    const createButtonText = wrapper.getByText('Create shared exception list');
    const createButton = createButtonText.closest('button')!;
    fireEvent.click(createButton);

    const createListOption = wrapper.getByTestId('manageExceptionListCreateExceptionListButton');
    fireEvent.click(createListOption);

    await waitFor(() => {
      expect(wrapper.getByTestId('createSharedExceptionListFlyout')).toBeInTheDocument();
    });

    const closeFlyoutButton = wrapper.getByTestId('closeFlyoutButton');
    fireEvent.click(closeFlyoutButton);

    await waitFor(() => {
      expect(createButton).toHaveFocus();
    });
  });
});
