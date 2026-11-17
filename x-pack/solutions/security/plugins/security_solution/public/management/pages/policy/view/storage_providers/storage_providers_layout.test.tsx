/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { setExportProviders } from '../../../../../../common/endpoint/models/export_providers';
import { MAX_EXPORT_PROVIDERS_PER_POLICY } from '../../../../../../common/endpoint/service/response_actions/export_providers';
import type {
  ExportProvider,
  PolicyConfig,
  PolicyData,
} from '../../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../../common/components/user_privileges/__mocks__';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../common/components/user_privileges/endpoint/mocks';
import { fleetPutEndpointPackagePolicyHttpMock } from '../../../../mocks';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { policyDetails } from '../../store/policy_details/selectors';
import { StorageProvidersLayout } from './storage_providers_layout';

jest.mock('../../../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

const createProvider = (id: string, overrides: Partial<ExportProvider> = {}): ExportProvider => ({
  id,
  type: 'azure_blob',
  account_name: 'acct1',
  container: 'dumps',
  ...overrides,
});

/** Renders the layout with the policy from the store, like the policy details page does */
const StoreBackedLayout = () => {
  const policy = usePolicyDetailsSelector(policyDetails);
  return policy ? <StorageProvidersLayout policy={policy} /> : null;
};

describe('When rendering the StorageProvidersLayout', () => {
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof fleetPutEndpointPackagePolicyHttpMock>;
  let policy: PolicyData;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const setStorePolicy = (policyItem: PolicyData) => {
    act(() => {
      mockedContext.store.dispatch({
        type: 'serverReturnedPolicyDetailsData',
        payload: { policyItem },
      });
    });
  };

  const render = (providers: readonly ExportProvider[] = []) => {
    policy.inputs[0].config.policy.value = setExportProviders(
      policy.inputs[0].config.policy.value,
      providers
    );
    renderResult = mockedContext.render(<StoreBackedLayout />);
    // After mounting: the initial URL change resets the policy details store
    setStorePolicy(policy);
    return renderResult;
  };

  /** The policy config of the one update request sent so far */
  const getSentPolicyConfig = (): PolicyConfig => {
    const { calls } = apiMocks.responseProvider.updateEndpointPolicy.mock;
    expect(calls).toHaveLength(1);
    const [{ path, body }] = calls[0];
    expect(path).toBe(packagePolicyRouteService.getUpdatePath(policy.id));
    return JSON.parse(body as string).inputs[0].config.policy.value;
  };

  /** The providers of the update request, after checking windows, mac and linux got the same list */
  const getSentProviders = (): readonly ExportProvider[] | undefined => {
    const { windows, mac, linux } = getSentPolicyConfig();
    const windowsProviders = windows.response_actions?.export_providers;
    expect(mac.response_actions?.export_providers).toEqual(windowsProviders);
    expect(linux.response_actions?.export_providers).toEqual(windowsProviders);
    return windowsProviders;
  };

  const waitForUpdateRequest = () =>
    waitFor(() => {
      expect(apiMocks.responseProvider.updateEndpointPolicy).toHaveBeenCalled();
    });

  /** Replaces a field's value, then leaves the field */
  const setFieldValue = async (testSubj: string, value: string) => {
    const input = renderResult.getByTestId(testSubj);
    await userEvent.clear(input);
    if (value) {
      await userEvent.type(input, value);
    }
    await userEvent.tab();
  };

  const openAdvancedSettings = async () => {
    await userEvent.click(
      within(renderResult.getByTestId('storageProviderFlyout-advancedSettings')).getByRole(
        'button',
        { name: 'Advanced settings' }
      )
    );
  };

  const fillAddFlyout = async ({ id, account_name: accountName, container }: ExportProvider) => {
    await userEvent.click(renderResult.getByTestId('storageProvidersAddButton'));
    await renderResult.findByTestId('storageProviderFlyout');
    await setFieldValue('storageProviderFlyout-nameInput', id);
    await setFieldValue('storageProviderFlyout-accountNameInput', accountName);
    await setFieldValue('storageProviderFlyout-containerInput', container);
  };

  const clickRowAction = async (providerId: string, actionTestSubj: string) => {
    await userEvent.click(
      within(renderResult.getByTestId(`storageProvidersTableRow-${providerId}`)).getByTestId(
        actionTestSubj
      )
    );
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    apiMocks = fleetPutEndpointPackagePolicyHttpMock(mockedContext.coreStart.http);
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy();
  });

  afterEach(() => {
    useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
  });

  describe('and the user can write policies', () => {
    it('should show an empty state with the add button when the policy has no providers', () => {
      render();

      const emptyState = renderResult.getByTestId('storageProvidersEmptyState');
      expect(emptyState).toHaveTextContent('No storage providers');
      expect(emptyState).toHaveTextContent(
        'Storage providers apply to Windows, macOS, and Linux hosts using this policy.'
      );
      expect(within(emptyState).getByTestId('storageProvidersAddButton')).toBeEnabled();
      expect(renderResult.queryByTestId('storageProvidersTable')).not.toBeInTheDocument();
    });

    it('should list the providers with their type, account, container and service URL', () => {
      render([
        createProvider('azure-1'),
        createProvider('azure-2', {
          account_name: 'acct2',
          container: 'files',
          service_url: 'https://acct2.blob.example.com',
        }),
      ]);

      expect(renderResult.getByTestId('storageProvidersDescription')).toHaveTextContent(
        'Response actions can upload the files they collect to your own storage instead of Fleet.'
      );

      const firstRow = renderResult.getByTestId('storageProvidersTableRow-azure-1');
      for (const text of ['azure-1', 'Azure Blob Storage', 'acct1', 'dumps', 'Default']) {
        expect(firstRow).toHaveTextContent(text);
      }

      const secondRow = renderResult.getByTestId('storageProvidersTableRow-azure-2');
      for (const text of ['azure-2', 'acct2', 'files', 'https://acct2.blob.example.com']) {
        expect(secondRow).toHaveTextContent(text);
      }
      expect(secondRow).not.toHaveTextContent('Default');

      for (const row of [firstRow, secondRow]) {
        expect(within(row).getByTestId('storageProvidersEditAction')).toBeInTheDocument();
        expect(within(row).getByTestId('storageProvidersDeleteAction')).toBeInTheDocument();
      }
      expect(renderResult.getByTestId('storageProvidersAddButton')).toBeEnabled();
    });

    it('should add a provider to windows, mac and linux in one policy update', async () => {
      const existing = createProvider('azure-1');
      const added = createProvider('azure-2', { account_name: 'acct2', container: 'files' });
      render([existing]);

      await fillAddFlyout(added);
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitForUpdateRequest();

      const sentProviders = getSentProviders();
      expect(sentProviders).toEqual([existing, added]);
      // An empty service URL field is left out, not sent as ''
      expect(sentProviders?.[1]).not.toHaveProperty('service_url');

      await waitFor(() => {
        expect(renderResult.queryByTestId('storageProviderFlyout')).not.toBeInTheDocument();
      });
      expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Added storage provider azure-2' })
      );
      expect(renderResult.getByTestId('storageProvidersTableRow-azure-2')).toBeInTheDocument();
    });

    it('should add the first provider from the empty state with a service URL', async () => {
      const added = createProvider('azure-1', { service_url: 'https://acct1.blob.example.com' });
      render();

      await fillAddFlyout(added);
      await openAdvancedSettings();
      await setFieldValue(
        'storageProviderFlyout-serviceUrlInput',
        'https://acct1.blob.example.com'
      );
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitForUpdateRequest();

      expect(getSentProviders()).toEqual([added]);
    });

    it('should edit a provider without letting its name change', async () => {
      const first = createProvider('azure-1');
      const second = createProvider('azure-2', { container: 'files' });
      render([first, second]);

      await clickRowAction('azure-2', 'storageProvidersEditAction');
      const nameInput = await renderResult.findByTestId('storageProviderFlyout-nameInput');
      expect(nameInput).toHaveValue('azure-2');
      expect(nameInput).toHaveAttribute('readonly');
      expect(renderResult.getByTestId('storageProviderFlyout')).toHaveTextContent(
        "Can't be changed. To rename this provider, delete it and add a new one."
      );
      // Nothing changed yet
      expect(renderResult.getByTestId('storageProviderFlyout-saveButton')).toBeDisabled();

      await setFieldValue('storageProviderFlyout-containerInput', 'newfiles');
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitForUpdateRequest();

      expect(getSentProviders()).toEqual([first, { ...second, container: 'newfiles' }]);
      expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated storage provider azure-2' })
      );
    });

    it('should drop the service URL when its field is cleared', async () => {
      render([createProvider('azure-1', { service_url: 'https://acct1.blob.example.com' })]);

      await clickRowAction('azure-1', 'storageProvidersEditAction');
      // A saved URL opens the advanced settings
      await setFieldValue('storageProviderFlyout-serviceUrlInput', '');
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitForUpdateRequest();

      const sentProviders = getSentProviders();
      expect(sentProviders).toEqual([createProvider('azure-1')]);
      expect(sentProviders?.[0]).not.toHaveProperty('service_url');
    });

    it('should delete a provider after confirmation', async () => {
      const second = createProvider('azure-2');
      render([createProvider('azure-1'), second]);

      await clickRowAction('azure-1', 'storageProvidersDeleteAction');
      const modal = await renderResult.findByTestId('deleteStorageProviderModal');
      expect(modal).toHaveTextContent('Delete storage provider azure-1?');
      expect(modal).toHaveTextContent(
        "Exports to this provider that haven't reached a host yet will fail."
      );

      await userEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));
      await waitForUpdateRequest();

      expect(getSentProviders()).toEqual([second]);
      await waitFor(() => {
        expect(
          renderResult.queryByTestId('storageProvidersTableRow-azure-1')
        ).not.toBeInTheDocument();
      });
      expect(renderResult.queryByTestId('deleteStorageProviderModal')).not.toBeInTheDocument();
      expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Deleted storage provider azure-1' })
      );
    });

    it('should remove response_actions from every OS when the last provider is deleted', async () => {
      render([createProvider('azure-1')]);

      await clickRowAction('azure-1', 'storageProvidersDeleteAction');
      await userEvent.click(renderResult.getByTestId('confirmModalConfirmButton'));
      await waitForUpdateRequest();

      const { windows, mac, linux } = getSentPolicyConfig();
      for (const os of [windows, mac, linux]) {
        expect(os).not.toHaveProperty('response_actions');
      }
      expect(await renderResult.findByTestId('storageProvidersEmptyState')).toBeInTheDocument();
    });

    it('should disable adding at the provider limit', async () => {
      render(
        Array.from({ length: MAX_EXPORT_PROVIDERS_PER_POLICY }, (_, index) =>
          createProvider(`azure-${index}`)
        )
      );

      const addButton = renderResult.getByTestId('storageProvidersAddButton');
      expect(addButton).toBeDisabled();

      // The tooltip is on the wrapper because a disabled button gets no mouse events
      await userEvent.hover(addButton.parentElement as HTMLElement);
      expect(await renderResult.findByRole('tooltip')).toHaveTextContent(
        'A policy can have up to 10 storage providers. Delete one to add another.'
      );
    });

    it.each([
      ['an empty name', 'storageProviderFlyout-nameInput', '', 'Enter a name.'],
      [
        'a name with a space',
        'storageProviderFlyout-nameInput',
        'azure 2',
        'Use only letters, digits, underscores (_), and hyphens (-), without spaces.',
      ],
      [
        'a name that is already used',
        'storageProviderFlyout-nameInput',
        'azure-1',
        'This policy already has a storage provider with this name.',
      ],
      [
        'a name over 64 characters',
        'storageProviderFlyout-nameInput',
        'a'.repeat(65),
        'Use at most 64 characters.',
      ],
      [
        'an empty storage account name',
        'storageProviderFlyout-accountNameInput',
        '',
        'Enter a storage account name.',
      ],
      [
        'an uppercase storage account name',
        'storageProviderFlyout-accountNameInput',
        'Acct1',
        'Use 3-24 lowercase letters and digits, without spaces.',
      ],
      ['an empty container', 'storageProviderFlyout-containerInput', '', 'Enter a container name.'],
      [
        'a container with a trailing space',
        'storageProviderFlyout-containerInput',
        'dumps ',
        'Use 3-63 lowercase letters, digits, and single hyphens (-), starting and ending with a letter or digit.',
      ],
    ])(
      'should show an error for %s once the field is left',
      async (_, testSubj, value, message) => {
        render([createProvider('azure-1')]);
        await fillAddFlyout(createProvider('azure-2'));
        expect(renderResult.getByTestId('storageProviderFlyout-saveButton')).toBeEnabled();

        await setFieldValue(testSubj, value);

        expect(renderResult.getByTestId('storageProviderFlyout')).toHaveTextContent(message);
        expect(renderResult.getByTestId('storageProviderFlyout-saveButton')).toBeDisabled();
      }
    );

    it.each([
      ['http URL', 'http://acct1.blob.example.com', 'Use a URL that starts with https://.'],
      [
        'URL with a query',
        'https://acct1.blob.example.com?sv=2024',
        'Enter a URL that starts with https:// and has no spaces, credentials (@), query (?), fragment (#), or backslashes (\\).',
      ],
      [
        'URL with credentials',
        'https://user@acct1.blob.example.com',
        'Enter a URL that starts with https:// and has no spaces',
      ],
      [
        'URL with uppercase scheme',
        'HTTPS://acct1.blob.example.com',
        'Enter a URL that starts with https:// and has no spaces',
      ],
    ])('should show an error for a service %s', async (_, value, message) => {
      render();
      await fillAddFlyout(createProvider('azure-1'));
      await openAdvancedSettings();

      await setFieldValue('storageProviderFlyout-serviceUrlInput', value);

      expect(renderResult.getByTestId('storageProviderFlyout')).toHaveTextContent(message);
      expect(renderResult.getByTestId('storageProviderFlyout-saveButton')).toBeDisabled();
    });

    it('should keep the flyout open and show the server error when the update fails', async () => {
      const serverMessage =
        'export_providers[1] "azure-2": account_name must be 3-24 lowercase letters and digits';
      apiMocks.responseProvider.updateEndpointPolicy.mockImplementation(() => {
        throw Object.assign(new Error('Bad Request'), {
          body: { statusCode: 400, error: 'Bad Request', message: serverMessage },
        });
      });
      render([createProvider('azure-1')]);

      await fillAddFlyout(createProvider('azure-2'));
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));

      expect(await renderResult.findByTestId('storageProviderFlyout-saveError')).toHaveTextContent(
        serverMessage
      );
      expect(renderResult.getByTestId('storageProviderFlyout')).toBeInTheDocument();
      expect(renderResult.getByTestId('storageProviderFlyout-saveButton')).toBeEnabled();
      expect(mockedContext.coreStart.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    });

    it('should keep the delete modal open and show the server error when the update fails', async () => {
      apiMocks.responseProvider.updateEndpointPolicy.mockImplementation(() => {
        throw Object.assign(new Error('Forbidden'), {
          body: { statusCode: 403, message: 'Platinum license does not support this action.' },
        });
      });
      render([createProvider('azure-1')]);

      await clickRowAction('azure-1', 'storageProvidersDeleteAction');
      await userEvent.click(renderResult.getByTestId('confirmModalConfirmButton'));

      expect(await renderResult.findByTestId('deleteStorageProviderModal-error')).toHaveTextContent(
        'Platinum license does not support this action.'
      );
      expect(renderResult.getByTestId('deleteStorageProviderModal')).toBeInTheDocument();
    });

    it('should base the update on the latest policy in the store', async () => {
      const first = createProvider('azure-1');
      render([first]);
      await fillAddFlyout(createProvider('azure-3'));

      // The policy changes while the flyout is open
      const addedElsewhere = createProvider('azure-2');
      const latestPolicy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy();
      latestPolicy.inputs[0].config.policy.value = setExportProviders(
        latestPolicy.inputs[0].config.policy.value,
        [first, addedElsewhere]
      );
      latestPolicy.inputs[0].config.policy.value.windows.popup.malware.message =
        'changed elsewhere';
      setStorePolicy(latestPolicy);

      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitForUpdateRequest();

      expect(getSentProviders()).toEqual([first, addedElsewhere, createProvider('azure-3')]);
      expect(getSentPolicyConfig().windows.popup.malware.message).toBe('changed elsewhere');
    });
  });

  describe('and the user can only read policies', () => {
    beforeEach(() => {
      useUserPrivilegesMock.mockReturnValue({
        ...getUserPrivilegesMockDefaultValue(),
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canWritePolicyManagement: false,
        }),
      });
    });

    it('should list the providers without add, edit or delete controls', () => {
      render([createProvider('azure-1')]);

      expect(renderResult.getByTestId('storageProvidersTableRow-azure-1')).toHaveTextContent(
        'acct1'
      );
      expect(renderResult.queryByTestId('storageProvidersAddButton')).not.toBeInTheDocument();
      expect(renderResult.queryByTestId('storageProvidersEditAction')).not.toBeInTheDocument();
      expect(renderResult.queryByTestId('storageProvidersDeleteAction')).not.toBeInTheDocument();
    });

    it('should show the empty state without the add button', () => {
      render();

      expect(renderResult.getByTestId('storageProvidersEmptyState')).toBeInTheDocument();
      expect(renderResult.queryByTestId('storageProvidersAddButton')).not.toBeInTheDocument();
    });
  });
});
