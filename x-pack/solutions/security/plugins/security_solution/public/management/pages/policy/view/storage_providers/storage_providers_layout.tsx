/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableColumn, EuiTableActionsColumnType } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useDispatch } from 'react-redux-v7';
import { cloneDeep, isObject } from 'lodash';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useToasts } from '../../../../../common/lib/kibana';
import { useUpdateEndpointPolicy } from '../../../../hooks/policy/use_update_endpoint_policy';
import {
  getExportProviders,
  setExportProviders,
} from '../../../../../../common/endpoint/models/export_providers';
import { MAX_EXPORT_PROVIDERS_PER_POLICY } from '../../../../../../common/endpoint/service/response_actions/export_providers';
import type {
  ExportProvider,
  ImmutableObject,
  PolicyData,
} from '../../../../../../common/endpoint/types';
import { StorageProviderFlyout } from './storage_provider_flyout';
import { DeleteStorageProviderModal } from './delete_storage_provider_modal';
import {
  ACCOUNT_NAME_COLUMN_LABEL,
  ACTIONS_COLUMN_LABEL,
  ADD_BUTTON_LABEL,
  CONTAINER_COLUMN_LABEL,
  DEFAULT_SERVICE_URL_LABEL,
  DELETE_ACTION_DESCRIPTION,
  DELETE_ACTION_LABEL,
  EDIT_ACTION_DESCRIPTION,
  EDIT_ACTION_LABEL,
  EMPTY_STATE_TITLE,
  EXPORT_PROVIDER_TYPE_LABELS,
  getAddSuccessMessage,
  getDeleteSuccessMessage,
  getEditSuccessMessage,
  MAX_PROVIDERS_TOOLTIP,
  NAME_COLUMN_LABEL,
  SERVICE_URL_COLUMN_LABEL,
  STORAGE_PROVIDERS_DESCRIPTION,
  STORAGE_PROVIDERS_TITLE,
  TABLE_CAPTION,
  TYPE_COLUMN_LABEL,
} from './translations';

/** Fleet puts the reason (e.g. which provider field is invalid) in the response body */
const getServerErrorMessage = ({ body, message }: IHttpFetchError): string =>
  isObject(body) && 'message' in body && typeof body.message === 'string' ? body.message : message;

/** Which provider the add/edit flyout is open for; `provider` is undefined when adding */
interface FlyoutState {
  provider?: ExportProvider;
}

export interface StorageProvidersLayoutProps {
  policy: ImmutableObject<PolicyData>;
}

/**
 * The policy's storage (export) providers. Each add, edit or delete is saved to the package policy
 * right away, with the same list for windows, mac and linux.
 */
export const StorageProvidersLayout = memo<StorageProvidersLayoutProps>(({ policy }) => {
  const toasts = useToasts();
  const dispatch = useDispatch();
  const { canWritePolicyManagement } = useUserPrivileges().endpointPrivileges;
  const {
    mutate: sendPolicyUpdate,
    isLoading: isSaving,
    error: saveError,
    reset: resetSaveState,
  } = useUpdateEndpointPolicy();

  const [flyoutState, setFlyoutState] = useState<FlyoutState | undefined>();
  const [providerToDelete, setProviderToDelete] = useState<ExportProvider | undefined>();

  const providers = useMemo(
    () => getExportProviders(policy.inputs[0].config.policy.value),
    [policy]
  );
  const isAtLimit = providers.length >= MAX_EXPORT_PROVIDERS_PER_POLICY;
  const saveErrorMessage = saveError ? getServerErrorMessage(saveError) : undefined;

  /** Saves `nextProviders` into `policy`, the latest version from the store */
  const saveProviders = useCallback(
    (nextProviders: readonly ExportProvider[], successMessage: string, onSuccess: () => void) => {
      const update = cloneDeep(policy as PolicyData);
      update.inputs[0].config.policy.value = setExportProviders(
        update.inputs[0].config.policy.value,
        nextProviders
      );

      sendPolicyUpdate(
        { policy: update },
        {
          onSuccess: ({ item: policyItem }) => {
            toasts.addSuccess({
              title: successMessage,
              'data-test-subj': 'storageProvidersSaveSuccessToast',
            });
            // The policy details store isn't refreshed by the update itself
            dispatch({ type: 'serverReturnedPolicyDetailsData', payload: { policyItem } });
            onSuccess();
          },
        }
      );
    },
    [dispatch, policy, sendPolicyUpdate, toasts]
  );

  const closeFlyout = useCallback(() => setFlyoutState(undefined), []);
  const closeDeleteModal = useCallback(() => setProviderToDelete(undefined), []);

  const openAddFlyout = useCallback(() => {
    resetSaveState();
    setFlyoutState({});
  }, [resetSaveState]);

  const openEditFlyout = useCallback(
    (provider: ExportProvider) => {
      resetSaveState();
      setFlyoutState({ provider });
    },
    [resetSaveState]
  );

  const openDeleteModal = useCallback(
    (provider: ExportProvider) => {
      resetSaveState();
      setProviderToDelete(provider);
    },
    [resetSaveState]
  );

  const handleFlyoutSave = useCallback(
    (provider: ExportProvider) => {
      if (flyoutState?.provider) {
        saveProviders(
          providers.map((existing) => (existing.id === provider.id ? provider : existing)),
          getEditSuccessMessage(provider.id),
          closeFlyout
        );
      } else {
        saveProviders([...providers, provider], getAddSuccessMessage(provider.id), closeFlyout);
      }
    },
    [closeFlyout, flyoutState?.provider, providers, saveProviders]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (providerToDelete) {
      saveProviders(
        providers.filter(({ id }) => id !== providerToDelete.id),
        getDeleteSuccessMessage(providerToDelete.id),
        closeDeleteModal
      );
    }
  }, [closeDeleteModal, providerToDelete, providers, saveProviders]);

  const otherIds = useMemo(
    () => providers.map(({ id }) => id).filter((id) => id !== flyoutState?.provider?.id),
    [flyoutState?.provider?.id, providers]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<ExportProvider>>>(
    () => [
      { field: 'id', name: NAME_COLUMN_LABEL, truncateText: true },
      {
        field: 'type',
        name: TYPE_COLUMN_LABEL,
        render: (type: ExportProvider['type']) => EXPORT_PROVIDER_TYPE_LABELS[type],
      },
      { field: 'account_name', name: ACCOUNT_NAME_COLUMN_LABEL, truncateText: true },
      { field: 'container', name: CONTAINER_COLUMN_LABEL, truncateText: true },
      {
        field: 'service_url',
        name: SERVICE_URL_COLUMN_LABEL,
        truncateText: true,
        render: (serviceUrl?: string) => serviceUrl ?? DEFAULT_SERVICE_URL_LABEL,
      },
      ...(canWritePolicyManagement
        ? [
            {
              name: ACTIONS_COLUMN_LABEL,
              actions: [
                {
                  name: EDIT_ACTION_LABEL,
                  description: EDIT_ACTION_DESCRIPTION,
                  type: 'icon',
                  icon: 'pencil',
                  onClick: openEditFlyout,
                  'data-test-subj': 'storageProvidersEditAction',
                },
                {
                  name: DELETE_ACTION_LABEL,
                  description: DELETE_ACTION_DESCRIPTION,
                  type: 'icon',
                  icon: 'trash',
                  color: 'danger',
                  onClick: openDeleteModal,
                  'data-test-subj': 'storageProvidersDeleteAction',
                },
              ],
            } satisfies EuiTableActionsColumnType<ExportProvider>,
          ]
        : []),
    ],
    [canWritePolicyManagement, openDeleteModal, openEditFlyout]
  );

  const addButton = (
    <EuiToolTip content={isAtLimit ? MAX_PROVIDERS_TOOLTIP : undefined}>
      <EuiButton
        fill
        iconType="plusCircle"
        onClick={openAddFlyout}
        disabled={isAtLimit}
        data-test-subj="storageProvidersAddButton"
      >
        {ADD_BUTTON_LABEL}
      </EuiButton>
    </EuiToolTip>
  );

  return (
    <div data-test-subj="storageProvidersLayout">
      {providers.length === 0 ? (
        <EuiEmptyPrompt
          color="subdued"
          iconType="storage"
          title={<h2>{EMPTY_STATE_TITLE}</h2>}
          body={<p>{STORAGE_PROVIDERS_DESCRIPTION}</p>}
          actions={canWritePolicyManagement ? addButton : undefined}
          data-test-subj="storageProvidersEmptyState"
        />
      ) : (
        <>
          <EuiPageHeader alignItems="center">
            <EuiPageHeaderSection>
              <EuiTitle size="m">
                <h2>{STORAGE_PROVIDERS_TITLE}</h2>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="xs" data-test-subj="storageProvidersDescription">
                <p>{STORAGE_PROVIDERS_DESCRIPTION}</p>
              </EuiText>
            </EuiPageHeaderSection>
            {canWritePolicyManagement && <EuiPageHeaderSection>{addButton}</EuiPageHeaderSection>}
          </EuiPageHeader>
          <EuiSpacer size="l" />
          <EuiBasicTable<ExportProvider>
            items={providers}
            itemId="id"
            columns={columns}
            rowHeader="id"
            tableCaption={TABLE_CAPTION}
            rowProps={({ id }) => ({ 'data-test-subj': `storageProvidersTableRow-${id}` })}
            data-test-subj="storageProvidersTable"
          />
        </>
      )}
      {flyoutState && (
        <StorageProviderFlyout
          provider={flyoutState.provider}
          otherIds={otherIds}
          isSaving={isSaving}
          errorMessage={saveErrorMessage}
          onSave={handleFlyoutSave}
          onClose={closeFlyout}
        />
      )}
      {providerToDelete && (
        <DeleteStorageProviderModal
          provider={providerToDelete}
          isDeleting={isSaving}
          errorMessage={saveErrorMessage}
          onConfirm={handleDeleteConfirm}
          onCancel={closeDeleteModal}
        />
      )}
    </div>
  );
});

StorageProvidersLayout.displayName = 'StorageProvidersLayout';
