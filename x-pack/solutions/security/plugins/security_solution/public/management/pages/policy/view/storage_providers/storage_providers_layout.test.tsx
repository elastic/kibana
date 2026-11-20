/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cloneDeep } from 'lodash';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import {
  getExportProviders,
  setExportProviders,
} from '../../../../../../common/endpoint/models/export_providers';
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
import { getDeferred } from '../../../../mocks/utils';
import { getPoliciesPath, getPolicyStorageProvidersPath } from '../../../../common/routing';
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

const createPolicy = (id: string, providers: readonly ExportProvider[] = []): PolicyData => {
  const packagePolicy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
    id,
    // No agent policies: nothing to fetch besides the package policy
    policy_ids: [],
  });
  packagePolicy.inputs[0].config.policy.value = setExportProviders(
    packagePolicy.inputs[0].config.policy.value,
    providers
  );
  return packagePolicy;
};

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
  /** Package policies returned by the Fleet GET API, by id */
  let serverPolicies: Map<string, PolicyData>;

  const setStorePolicy = (policyItem: PolicyData) => {
    act(() => {
      mockedContext.store.dispatch({
        type: 'serverReturnedPolicyDetailsData',
        payload: { policyItem },
      });
    });
  };

  /** Opens the storage providers URL of a policy with `providers`; the store loads it from the API */
  const render = async (providers: readonly ExportProvider[] = []) => {
    policy = createPolicy('policy-a', providers);
    serverPolicies.set(policy.id, policy);
    mockedContext.history.push(getPolicyStorageProvidersPath(policy.id));
    renderResult = mockedContext.render(<StoreBackedLayout />);
    await renderResult.findByTestId('storageProvidersLayout');
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
    serverPolicies = new Map();
    // Called as `http.get(path, options)`; the mock's type only lists the options-object overload
    mockedContext.coreStart.http.get.mockImplementation((path: unknown) => {
      const serverPolicy = [...serverPolicies.values()].find(
        ({ id }) => path === packagePolicyRouteService.getInfoPath(id)
      );
      // A copy: the policy details middleware edits the loaded policy
      return serverPolicy
        ? Promise.resolve({ item: cloneDeep(serverPolicy) })
        : Promise.reject(new Error(`API not mocked: ${String(path)}`));
    });
  });

  afterEach(() => {
    useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
  });

  describe('and the user can write policies', () => {
    it('should show an empty state with the add button when the policy has no providers', async () => {
      await render();

      const emptyState = renderResult.getByTestId('storageProvidersEmptyState');
      expect(emptyState).toHaveTextContent('No storage providers');
      expect(emptyState).toHaveTextContent(
        'Storage providers apply to Windows, macOS, and Linux hosts using this policy.'
      );
      expect(within(emptyState).getByTestId('storageProvidersAddButton')).toBeEnabled();
      expect(renderResult.queryByTestId('storageProvidersTable')).not.toBeInTheDocument();
    });

    it('should list the providers with their type, account, container and service URL', async () => {
      await render([
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
      await render([existing]);

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
      await render();

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

    it('should edit a provider', async () => {
      const first = createProvider('azure-1');
      const second = createProvider('azure-2', { container: 'files' });
      await render([first, second]);

      await clickRowAction('azure-2', 'storageProvidersEditAction');
      expect(await renderResult.findByTestId('storageProviderFlyout-nameInput')).toHaveValue(
        'azure-2'
      );
      expect(renderResult.getByTestId('storageProviderFlyout-typeSelect')).toBeDisabled();
      expect(renderResult.getByTestId('storageProviderFlyout')).toHaveTextContent(
        'Used in the response console as --export <name>.'
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

    it('should rename a provider in place, in one update', async () => {
      const first = createProvider('azure-1');
      const second = createProvider('azure-2', { container: 'files' });
      const third = createProvider('azure-3');
      await render([first, second, third]);

      await clickRowAction('azure-2', 'storageProvidersEditAction');
      await setFieldValue('storageProviderFlyout-nameInput', 'azure-files');
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitForUpdateRequest();

      // Same position in windows, mac and linux; the old name is gone
      expect(getSentProviders()).toEqual([first, { ...second, id: 'azure-files' }, third]);
      expect(mockedContext.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated storage provider azure-files' })
      );
      expect(
        await renderResult.findByTestId('storageProvidersTableRow-azure-files')
      ).toBeInTheDocument();
      expect(
        renderResult.queryByTestId('storageProvidersTableRow-azure-2')
      ).not.toBeInTheDocument();
    });

    it("should not allow renaming a provider to another provider's name", async () => {
      await render([createProvider('azure-1'), createProvider('azure-2')]);

      await clickRowAction('azure-2', 'storageProvidersEditAction');
      await setFieldValue('storageProviderFlyout-nameInput', 'azure-1');

      expect(renderResult.getByTestId('storageProviderFlyout')).toHaveTextContent(
        'This policy already has a storage provider with this name.'
      );
      expect(renderResult.getByTestId('storageProviderFlyout-saveButton')).toBeDisabled();
    });

    it('should warn about exports to the old name only while the name is changed', async () => {
      await render([createProvider('azure-1')]);
      const warning = "Exports to the old name that haven't reached a host yet will fail.";

      await clickRowAction('azure-1', 'storageProvidersEditAction');
      const flyout = await renderResult.findByTestId('storageProviderFlyout');
      expect(flyout).not.toHaveTextContent(warning);

      await setFieldValue('storageProviderFlyout-containerInput', 'other-dumps');
      expect(flyout).not.toHaveTextContent(warning);

      await setFieldValue('storageProviderFlyout-nameInput', 'azure-renamed');
      expect(
        renderResult.getByTestId('storageProviderFlyout-nameChangedWarning')
      ).toHaveTextContent(warning);

      await setFieldValue('storageProviderFlyout-nameInput', 'azure-1');
      expect(flyout).not.toHaveTextContent(warning);
    });

    it('should not warn about an old name when adding a provider', async () => {
      await render();

      await fillAddFlyout(createProvider('azure-1'));

      expect(
        renderResult.queryByTestId('storageProviderFlyout-nameChangedWarning')
      ).not.toBeInTheDocument();
      expect(
        renderResult.queryByTestId('storageProviderFlyout-destinationChangedWarning')
      ).not.toBeInTheDocument();
    });

    it('should warn under a destination field that exports will go to the new destination only while it is changed', async () => {
      await render([createProvider('azure-1', { service_url: 'https://acct1.blob.example.com' })]);
      const warning =
        "Exports to this provider, including ones that haven't reached a host yet, will go to the new destination.";
      const destinationFields = {
        accountName: ['storageProviderFlyout-accountNameInput', 'acct2', 'acct1'],
        container: ['storageProviderFlyout-containerInput', 'other-dumps', 'dumps'],
        serviceUrl: ['storageProviderFlyout-serviceUrlInput', '', 'https://acct1.blob.example.com'],
      } as const;
      type DestinationField = keyof typeof destinationFields;
      /** The warning shows in the help text of `warnedField`'s row only */
      const expectWarningOn = (warnedField?: DestinationField) => {
        for (const field of Object.keys(destinationFields) as DestinationField[]) {
          const fieldWarning = within(
            renderResult.getByTestId(`storageProviderFlyout-${field}Row`)
          ).queryByTestId('storageProviderFlyout-destinationChangedWarning');
          if (field === warnedField) {
            expect(fieldWarning).toHaveTextContent(warning);
          } else {
            expect(fieldWarning).not.toBeInTheDocument();
          }
        }
      };

      await clickRowAction('azure-1', 'storageProvidersEditAction');
      await renderResult.findByTestId('storageProviderFlyout');
      expectWarningOn(undefined);

      // The name isn't part of the destination
      await setFieldValue('storageProviderFlyout-nameInput', 'azure-renamed');
      expectWarningOn(undefined);

      for (const [field, [input, changed, saved]] of Object.entries(destinationFields)) {
        await setFieldValue(input, changed);
        expectWarningOn(field as DestinationField);

        await setFieldValue(input, saved);
        expectWarningOn(undefined);
      }
    });

    it('should not save an edit when the provider was changed since the flyout opened', async () => {
      const first = createProvider('azure-1');
      await render([first]);
      await clickRowAction('azure-1', 'storageProvidersEditAction');
      await setFieldValue('storageProviderFlyout-containerInput', 'other-dumps');

      // An earlier rename of this provider finishes now
      setStorePolicy(createPolicy(policy.id, [{ ...first, id: 'azure-renamed' }]));
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));

      expect(renderResult.getByTestId('storageProviderFlyout-saveError')).toHaveTextContent(
        'This storage provider was changed or removed. Close and reopen it.'
      );
      expect(apiMocks.responseProvider.updateEndpointPolicy).not.toHaveBeenCalled();
      expect(mockedContext.coreStart.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    });

    it('should not save an edit over a provider whose settings changed since the flyout opened', async () => {
      const first = createProvider('azure-1');
      await render([first]);
      await clickRowAction('azure-1', 'storageProvidersEditAction');
      await setFieldValue('storageProviderFlyout-accountNameInput', 'acct2');

      // An earlier save of this provider (same name, other container) finishes now
      setStorePolicy(createPolicy(policy.id, [{ ...first, container: 'changed-elsewhere' }]));
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));

      expect(renderResult.getByTestId('storageProviderFlyout-saveError')).toHaveTextContent(
        'This storage provider was changed or removed. Close and reopen it.'
      );
      expect(apiMocks.responseProvider.updateEndpointPolicy).not.toHaveBeenCalled();
    });

    it('should not delete when the provider was changed since the modal opened', async () => {
      const first = createProvider('azure-1');
      await render([first, createProvider('azure-2')]);
      await clickRowAction('azure-1', 'storageProvidersDeleteAction');

      setStorePolicy(createPolicy(policy.id, [{ ...first, id: 'azure-renamed' }]));
      await userEvent.click(renderResult.getByTestId('confirmModalConfirmButton'));

      expect(renderResult.getByTestId('deleteStorageProviderModal-error')).toHaveTextContent(
        'This storage provider was changed or removed. Close and reopen it.'
      );
      expect(apiMocks.responseProvider.updateEndpointPolicy).not.toHaveBeenCalled();
    });

    it('should drop the service URL when its field is cleared', async () => {
      await render([createProvider('azure-1', { service_url: 'https://acct1.blob.example.com' })]);

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
      await render([createProvider('azure-1'), second]);

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
      await render([createProvider('azure-1')]);

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
      await render(
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

    it('should allow adding up to the provider limit, then disable adding', async () => {
      await render(
        Array.from({ length: MAX_EXPORT_PROVIDERS_PER_POLICY - 1 }, (_, index) =>
          createProvider(`azure-${index}`)
        )
      );
      expect(renderResult.getByTestId('storageProvidersAddButton')).toBeEnabled();

      await fillAddFlyout(createProvider('azure-last'));
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitForUpdateRequest();

      expect(getSentProviders()).toHaveLength(MAX_EXPORT_PROVIDERS_PER_POLICY);
      await waitFor(() => {
        expect(renderResult.getByTestId('storageProvidersAddButton')).toBeDisabled();
      });
    });

    it('should only show a field error once the field is left', async () => {
      await render();
      await userEvent.click(renderResult.getByTestId('storageProvidersAddButton'));

      await userEvent.type(renderResult.getByTestId('storageProviderFlyout-nameInput'), 'azure 1');
      const nameError =
        'Use only letters, digits, underscores (_), and hyphens (-), without spaces.';
      expect(renderResult.getByTestId('storageProviderFlyout')).not.toHaveTextContent(nameError);
      expect(renderResult.getByTestId('storageProviderFlyout')).not.toHaveTextContent(
        'Enter a storage account name.'
      );

      await userEvent.tab();
      expect(renderResult.getByTestId('storageProviderFlyout')).toHaveTextContent(nameError);
      // Other untouched fields stay quiet
      expect(renderResult.getByTestId('storageProviderFlyout')).not.toHaveTextContent(
        'Enter a storage account name.'
      );
    });

    it('should disable saving again when an edited field is changed back', async () => {
      await render([createProvider('azure-1')]);
      await clickRowAction('azure-1', 'storageProvidersEditAction');
      const saveButton = await renderResult.findByTestId('storageProviderFlyout-saveButton');

      await setFieldValue('storageProviderFlyout-containerInput', 'other-dumps');
      expect(saveButton).toBeEnabled();

      await setFieldValue('storageProviderFlyout-containerInput', 'dumps');
      expect(saveButton).toBeDisabled();
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
        await render([createProvider('azure-1')]);
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
        'Enter a URL that starts with https://, uses only ASCII letters, digits and symbols, and has no spaces, credentials (@), query (?), fragment (#), or backslashes (\\).',
      ],
      [
        'URL with credentials',
        'https://user@acct1.blob.example.com',
        'Enter a URL that starts with https://, uses only ASCII',
      ],
      [
        'URL with uppercase scheme',
        'HTTPS://acct1.blob.example.com',
        'Enter a URL that starts with https://, uses only ASCII',
      ],
      [
        'URL with a non-ASCII look-alike character',
        // Cyrillic "о" in the host
        'https://acct1.blob.c\u043ere.windows.net',
        'Enter a URL that starts with https://, uses only ASCII',
      ],
    ])('should show an error for a service %s', async (_, value, message) => {
      await render();
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
      await render([createProvider('azure-1')]);

      await fillAddFlyout(createProvider('azure-2'));
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));

      expect(await renderResult.findByTestId('storageProviderFlyout-saveError')).toHaveTextContent(
        serverMessage
      );
      expect(renderResult.getByTestId('storageProviderFlyout')).toBeInTheDocument();
      expect(renderResult.getByTestId('storageProviderFlyout-saveButton')).toBeEnabled();
      expect(mockedContext.coreStart.notifications.toasts.addSuccess).not.toHaveBeenCalled();
      // The flyout shows the error; no second copy in a toast
      expect(mockedContext.coreStart.notifications.toasts.addDanger).not.toHaveBeenCalled();
    });

    it('should keep the delete modal open and show the server error when the update fails', async () => {
      apiMocks.responseProvider.updateEndpointPolicy.mockImplementation(() => {
        throw Object.assign(new Error('Forbidden'), {
          body: { statusCode: 403, message: 'Platinum license does not support this action.' },
        });
      });
      await render([createProvider('azure-1')]);

      await clickRowAction('azure-1', 'storageProvidersDeleteAction');
      await userEvent.click(renderResult.getByTestId('confirmModalConfirmButton'));

      expect(await renderResult.findByTestId('deleteStorageProviderModal-error')).toHaveTextContent(
        'Platinum license does not support this action.'
      );
      expect(renderResult.getByTestId('deleteStorageProviderModal')).toBeInTheDocument();
      expect(mockedContext.coreStart.notifications.toasts.addDanger).not.toHaveBeenCalled();
    });

    it.each([
      [
        'a save',
        "Couldn't save the storage provider",
        async () => {
          await fillAddFlyout(createProvider('azure-2'));
          await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
        },
      ],
      [
        'a delete',
        "Couldn't delete the storage provider",
        async () => {
          await clickRowAction('azure-1', 'storageProvidersDeleteAction');
          await userEvent.click(renderResult.getByTestId('confirmModalConfirmButton'));
        },
      ],
    ])('should show a toast when %s fails after the tab was left', async (_, title, start) => {
      const serverMessage = 'Platinum license does not support this action.';
      const response = getDeferred();
      apiMocks.responseProvider.updateEndpointPolicy.mockDelay.mockReturnValue(response.promise);
      apiMocks.responseProvider.updateEndpointPolicy.mockImplementation(() => {
        throw Object.assign(new Error('Forbidden'), {
          body: { statusCode: 403, message: serverMessage },
        });
      });
      await render([createProvider('azure-1')]);

      await start();
      await waitFor(() => {
        expect(apiMocks.responseProvider.updateEndpointPolicy.mockDelay).toHaveBeenCalled();
      });
      // The user switches tabs before the server responds
      renderResult.unmount();
      await act(async () => {
        response.resolve();
      });

      await waitFor(() => {
        expect(mockedContext.coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
          expect.objectContaining({ title, text: serverMessage })
        );
      });
    });

    it('should base the update on the latest policy in the store', async () => {
      const first = createProvider('azure-1');
      await render([first]);
      await fillAddFlyout(createProvider('azure-3'));

      // The policy changes while the flyout is open
      const addedElsewhere = createProvider('azure-2');
      const latestPolicy = createPolicy(policy.id, [first, addedElsewhere]);
      latestPolicy.inputs[0].config.policy.value.windows.popup.malware.message =
        'changed elsewhere';
      setStorePolicy(latestPolicy);

      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitForUpdateRequest();

      expect(getSentProviders()).toEqual([first, addedElsewhere, createProvider('azure-3')]);
      expect(getSentPolicyConfig().windows.popup.malware.message).toBe('changed elsewhere');
    });

    it('should update the store when the save finishes after the tab was left', async () => {
      const response = getDeferred();
      apiMocks.responseProvider.updateEndpointPolicy.mockDelay.mockReturnValue(response.promise);
      const existing = createProvider('azure-1');
      const added = createProvider('azure-2');
      await render([existing]);

      await fillAddFlyout(added);
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitFor(() => {
        expect(apiMocks.responseProvider.updateEndpointPolicy.mockDelay).toHaveBeenCalled();
      });

      // The user switches tabs before the server responds
      renderResult.unmount();
      await act(async () => {
        response.resolve();
      });

      await waitFor(() => {
        const { policyItem } = mockedContext.store.getState().management.policyDetails;
        expect(policyItem && getExportProviders(policyItem.inputs[0].config.policy.value)).toEqual([
          existing,
          added,
        ]);
      });
    });

    it('should not keep a late save response once the user left the policy, so the next one loads', async () => {
      const response = getDeferred();
      apiMocks.responseProvider.updateEndpointPolicy.mockDelay.mockReturnValue(response.promise);
      await render([createProvider('azure-1')]);
      await fillAddFlyout(createProvider('azure-2'));
      await userEvent.click(renderResult.getByTestId('storageProviderFlyout-saveButton'));
      await waitFor(() => {
        expect(apiMocks.responseProvider.updateEndpointPolicy.mockDelay).toHaveBeenCalled();
      });

      // The user goes back to the policy list, then the save of policy A finishes
      act(() => {
        mockedContext.history.push(getPoliciesPath());
      });
      await act(async () => {
        response.resolve();
      });
      expect(mockedContext.store.getState().management.policyDetails.policyItem).toBeUndefined();

      // ...and opens policy B
      const policyB = createPolicy('policy-b', [createProvider('b-provider')]);
      serverPolicies.set(policyB.id, policyB);
      act(() => {
        mockedContext.history.push(getPolicyStorageProvidersPath(policyB.id));
      });

      expect(
        await renderResult.findByTestId('storageProvidersTableRow-b-provider')
      ).toBeInTheDocument();
      expect(
        renderResult.queryByTestId('storageProvidersTableRow-azure-1')
      ).not.toBeInTheDocument();
      expect(mockedContext.coreStart.http.get).toHaveBeenCalledWith(
        packagePolicyRouteService.getInfoPath(policyB.id),
        expect.anything()
      );
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

    it('should list the providers without add, edit or delete controls', async () => {
      await render([createProvider('azure-1')]);

      expect(renderResult.getByTestId('storageProvidersTableRow-azure-1')).toHaveTextContent(
        'acct1'
      );
      expect(renderResult.queryByTestId('storageProvidersAddButton')).not.toBeInTheDocument();
      expect(renderResult.queryByTestId('storageProvidersEditAction')).not.toBeInTheDocument();
      expect(renderResult.queryByTestId('storageProvidersDeleteAction')).not.toBeInTheDocument();
    });

    it('should show the empty state without the add button', async () => {
      await render();

      expect(renderResult.getByTestId('storageProvidersEmptyState')).toBeInTheDocument();
      expect(renderResult.queryByTestId('storageProvidersAddButton')).not.toBeInTheDocument();
    });
  });
});
