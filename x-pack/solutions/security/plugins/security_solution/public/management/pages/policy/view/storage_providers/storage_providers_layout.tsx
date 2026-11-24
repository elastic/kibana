/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { cloneDeep, isEqual, isObject } from 'lodash';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useToasts } from '../../../../../common/lib/kibana';
import { useUpdateEndpointPolicy } from '../../../../hooks/policy/use_update_endpoint_policy';
import { useSetExportProviderKey } from '../../../../hooks/policy/use_set_export_provider_key';
import {
  getExportProviders,
  setExportProviders,
} from '../../../../../../common/endpoint/models/export_providers';
import { MAX_EXPORT_PROVIDERS_PER_POLICY } from '../../../../../../common/endpoint/service/response_actions/export_providers';
import type {
  ExportProvider,
  ExportProviderCredentials,
  ImmutableObject,
  PolicyData,
} from '../../../../../../common/endpoint/types';
import { StorageProviderFlyout } from './storage_provider_flyout';
import type { StorageProviderSaveInput } from './storage_provider_flyout';
import { DeleteStorageProviderModal } from './delete_storage_provider_modal';
import {
  ACCOUNT_NAME_COLUMN_LABEL,
  ACTIONS_COLUMN_LABEL,
  ADD_BUTTON_LABEL,
  CONTAINER_COLUMN_LABEL,
  DEFAULT_SERVICE_URL_LABEL,
  DELETE_ACTION_DESCRIPTION,
  DELETE_ACTION_LABEL,
  DELETE_ERROR_TITLE,
  EDIT_ACTION_DESCRIPTION,
  EDIT_ACTION_LABEL,
  EMPTY_STATE_TITLE,
  EXPORT_PROVIDER_TYPE_LABELS,
  getAddSuccessMessage,
  getDeleteSuccessMessage,
  getEditSuccessMessage,
  getKeySaveErrorMessage,
  KEY_COLUMN_LABEL,
  KEY_MISSING_LABEL,
  KEY_MISSING_TOOLTIP,
  KEY_SAVE_CONFLICT_ERROR_MESSAGE,
  KEY_STORED_LABEL,
  MAX_PROVIDERS_TOOLTIP,
  NAME_COLUMN_LABEL,
  PROVIDER_CHANGED_ERROR_MESSAGE,
  SAVE_ERROR_TITLE,
  SERVICE_URL_COLUMN_LABEL,
  STORAGE_PROVIDERS_DESCRIPTION,
  STORAGE_PROVIDERS_TITLE,
  TABLE_CAPTION,
  TYPE_COLUMN_LABEL,
} from './translations';

/** Fleet puts the reason (e.g. which provider field is invalid) in the response body */
const getServerErrorMessage = ({ body, message }: IHttpFetchError): string =>
  isObject(body) && 'message' in body && typeof body.message === 'string' ? body.message : message;

/** Whether the key route rejected the request because the policy changed in between (409) */
const isPolicyVersionConflict = ({ body }: IHttpFetchError): boolean =>
  isObject(body) && 'statusCode' in body && body.statusCode === 409;

/** Which provider the add/edit flyout is open for; `provider` is undefined when adding */
interface FlyoutState {
  /**
   * The provider being edited; updated to the saved provider once its fields are saved, so the
   * "changed since the flyout opened" guard compares a key retry against that, not the one the
   * flyout opened with.
   */
  provider?: ExportProvider;
  /** The policy `version` when the flyout opened; used for a key-only save (no field changes) */
  openedPolicyVersion: string;
  /**
   * Set once the provider's fields were saved but the key wasn't: the flyout's fields become
   * read-only and the next Save only retries the key, pinned to this version.
   */
  keyRetry?: {
    packagePolicyVersion: string;
    errorMessage: string;
    successMessage: string;
  };
}

interface SaveProvidersMessages {
  successMessage: string;
  /** Title of the danger toast shown when the update fails after its flyout/modal is gone */
  errorTitle: string;
}

interface SaveProviderKeyParams {
  provider: ExportProvider;
  /** Plaintext; never put into the store or the policy object */
  accountKey: string;
  packagePolicyVersion: string;
  successMessage: string;
}

export interface StorageProvidersLayoutProps {
  policy: ImmutableObject<PolicyData>;
}

/**
 * The policy's storage (export) providers. Each add, edit or delete is saved to the package policy
 * right away, with the same list for windows, mac and linux. The storage account key, when entered,
 * is set separately through the dedicated key route; the package policy only ever keeps a reference.
 */
export const StorageProvidersLayout = memo<StorageProvidersLayoutProps>(({ policy }) => {
  const toasts = useToasts();
  const dispatch = useDispatch();
  const { canWritePolicyManagement } = useUserPrivileges().endpointPrivileges;
  const {
    mutateAsync: sendPolicyUpdate,
    isLoading: isSavingPolicy,
    error: saveError,
    reset: resetSaveState,
  } = useUpdateEndpointPolicy();
  const { setExportProviderKey: sendSetExportProviderKey, isLoading: isSavingKey } =
    useSetExportProviderKey();
  const isSaving = isSavingPolicy || isSavingKey;

  const [flyoutState, setFlyoutState] = useState<FlyoutState | undefined>();
  const [providerToDelete, setProviderToDelete] = useState<ExportProvider | undefined>();
  // The provider being edited or deleted is no longer in the latest policy (e.g. a rename that
  // finished after the tab was left changed its id), so saving would change nothing
  const [isProviderGone, setIsProviderGone] = useState(false);

  const providers = useMemo(
    () => getExportProviders(policy.inputs[0].config.policy.value),
    [policy]
  );
  const isAtLimit = providers.length >= MAX_EXPORT_PROVIDERS_PER_POLICY;
  const saveErrorMessage = saveError ? getServerErrorMessage(saveError) : undefined;
  const dialogErrorMessage = isProviderGone ? PROVIDER_CHANGED_ERROR_MESSAGE : saveErrorMessage;
  const keyErrorMessage = flyoutState?.keyRetry?.errorMessage;
  const isKeyOnlyRetry = flyoutState?.keyRetry !== undefined;

  // Whether a flyout or modal is open to show an update's error; false once this tab unmounts
  const isDialogOpenRef = useRef(false);
  useEffect(() => {
    isDialogOpenRef.current = flyoutState !== undefined || providerToDelete !== undefined;
    return () => {
      isDialogOpenRef.current = false;
    };
  }, [flyoutState, providerToDelete]);

  /** Saves `nextProviders` into `policy`, the latest version from the store */
  const saveProviders = useCallback(
    (
      nextProviders: readonly ExportProvider[],
      { successMessage, errorTitle }: SaveProvidersMessages,
      onSuccess: () => void
    ) => {
      const update = cloneDeep(policy as PolicyData);
      update.inputs[0].config.policy.value = setExportProviders(
        update.inputs[0].config.policy.value,
        nextProviders
      );

      // Handled on the returned promise, not with `mutate`'s per-call `onSuccess`: that one doesn't
      // run once this tab unmounts, so the store would keep the old policy (and its `version`)
      sendPolicyUpdate({ policy: update })
        .then(({ item: policyItem }) => {
          toasts.addSuccess({
            title: successMessage,
            'data-test-subj': 'storageProvidersSaveSuccessToast',
          });
          // The policy details store isn't refreshed by the update itself
          dispatch({ type: 'serverReturnedPolicyDetailsData', payload: { policyItem } });
          onSuccess();
        })
        .catch((error: IHttpFetchError) => {
          // An open flyout or modal shows the error from the mutation state; without one (the tab
          // was left while the request was pending), nothing would
          if (!isDialogOpenRef.current) {
            toasts.addDanger({
              title: errorTitle,
              text: getServerErrorMessage(error),
              'data-test-subj': 'storageProvidersSaveFailureToast',
            });
          }
        });
    },
    [dispatch, policy, sendPolicyUpdate, toasts]
  );

  const closeFlyout = useCallback(() => setFlyoutState(undefined), []);
  const closeDeleteModal = useCallback(() => setProviderToDelete(undefined), []);

  const resetDialogErrors = useCallback(() => {
    resetSaveState();
    setIsProviderGone(false);
  }, [resetSaveState]);

  const openAddFlyout = useCallback(() => {
    resetDialogErrors();
    setFlyoutState({ openedPolicyVersion: policy.version ?? '' });
  }, [policy.version, resetDialogErrors]);

  const openEditFlyout = useCallback(
    (provider: ExportProvider) => {
      resetDialogErrors();
      setFlyoutState({ provider, openedPolicyVersion: policy.version ?? '' });
    },
    [policy.version, resetDialogErrors]
  );

  const openDeleteModal = useCallback(
    (provider: ExportProvider) => {
      resetDialogErrors();
      setProviderToDelete(provider);
    },
    [resetDialogErrors]
  );

  /** Sets or replaces the storage account key of `provider` through the dedicated key route */
  const saveProviderKey = useCallback(
    ({ provider, accountKey, packagePolicyVersion, successMessage }: SaveProviderKeyParams) => {
      sendSetExportProviderKey({
        packagePolicyId: policy.id,
        providerId: provider.id,
        accountKey,
        packagePolicyVersion,
      })
        .then(({ item: policyItem }) => {
          toasts.addSuccess({
            title: successMessage,
            'data-test-subj': 'storageProvidersSaveSuccessToast',
          });
          dispatch({ type: 'serverReturnedPolicyDetailsData', payload: { policyItem } });
          closeFlyout();
        })
        .catch((error: IHttpFetchError) => {
          if (!isDialogOpenRef.current) {
            toasts.addDanger({
              title: SAVE_ERROR_TITLE,
              text: getServerErrorMessage(error),
              'data-test-subj': 'storageProvidersSaveFailureToast',
            });
            return;
          }
          // The provider's fields are already saved; only the key save is retried, with the
          // same version, never a newer one picked up silently
          setFlyoutState((prev) =>
            prev
              ? {
                  ...prev,
                  provider,
                  keyRetry: {
                    packagePolicyVersion,
                    successMessage,
                    errorMessage: isPolicyVersionConflict(error)
                      ? KEY_SAVE_CONFLICT_ERROR_MESSAGE
                      : getKeySaveErrorMessage(getServerErrorMessage(error)),
                  },
                }
              : prev
          );
        });
    },
    [closeFlyout, dispatch, policy.id, sendSetExportProviderKey, toasts]
  );

  /** Saves the provider's fields first, then its new key with the version step 1 returned */
  const saveProviderFieldsThenKey = useCallback(
    (
      nextProviders: readonly ExportProvider[],
      savedProvider: ExportProvider,
      accountKey: string,
      messages: SaveProvidersMessages
    ) => {
      const update = cloneDeep(policy as PolicyData);
      update.inputs[0].config.policy.value = setExportProviders(
        update.inputs[0].config.policy.value,
        nextProviders
      );

      sendPolicyUpdate({ policy: update })
        .then(({ item: policyItem }) => {
          dispatch({ type: 'serverReturnedPolicyDetailsData', payload: { policyItem } });
          const packagePolicyVersion = policyItem.version ?? '';
          // The fields are saved from here on, as the server stored them (it drops a key reference
          // it doesn't accept), so a key retry compares against that provider
          const storedProvider =
            getExportProviders(policyItem.inputs[0].config.policy.value).find(
              ({ id }) => id === savedProvider.id
            ) ?? savedProvider;
          setFlyoutState((prev) =>
            prev
              ? { ...prev, provider: storedProvider, openedPolicyVersion: packagePolicyVersion }
              : prev
          );
          saveProviderKey({
            provider: storedProvider,
            accountKey,
            packagePolicyVersion,
            successMessage: messages.successMessage,
          });
        })
        .catch((error: IHttpFetchError) => {
          if (!isDialogOpenRef.current) {
            toasts.addDanger({
              title: messages.errorTitle,
              text: getServerErrorMessage(error),
              'data-test-subj': 'storageProvidersSaveFailureToast',
            });
          }
        });
    },
    [dispatch, policy, saveProviderKey, sendPolicyUpdate, toasts]
  );

  const handleFlyoutSave = useCallback(
    ({ provider, accountKey }: StorageProviderSaveInput) => {
      if (!flyoutState) {
        return;
      }

      // Retrying only the key: the provider's fields are already saved
      if (flyoutState.keyRetry) {
        const savedProvider = flyoutState.provider;
        if (
          savedProvider &&
          !isEqual(
            providers.find(({ id }) => id === savedProvider.id),
            savedProvider
          )
        ) {
          setIsProviderGone(true);
          return;
        }
        if (accountKey) {
          saveProviderKey({
            provider,
            accountKey,
            packagePolicyVersion: flyoutState.keyRetry.packagePolicyVersion,
            successMessage: flyoutState.keyRetry.successMessage,
          });
        }
        return;
      }

      const savedId = flyoutState.provider?.id;
      const isEdit = savedId !== undefined;

      if (isEdit) {
        // Saving over a provider changed since the flyout opened (e.g. by an earlier save that
        // finished after the tab was left) would silently undo that change
        if (
          !isEqual(
            providers.find(({ id }) => id === savedId),
            flyoutState.provider
          )
        ) {
          setIsProviderGone(true);
          return;
        }
      }

      const messages = isEdit
        ? { successMessage: getEditSuccessMessage(provider.id), errorTitle: SAVE_ERROR_TITLE }
        : { successMessage: getAddSuccessMessage(provider.id), errorTitle: SAVE_ERROR_TITLE };
      const fieldsChanged = !isEdit || !isEqual(provider, flyoutState.provider);

      if (!fieldsChanged) {
        // Key-only save: the fields didn't change, so step 1 is skipped
        if (accountKey) {
          saveProviderKey({
            provider,
            accountKey,
            packagePolicyVersion: flyoutState.openedPolicyVersion,
            successMessage: messages.successMessage,
          });
        }
        return;
      }

      const nextProviders = isEdit
        ? providers.map((existing) => (existing.id === savedId ? provider : existing))
        : [...providers, provider];

      if (!accountKey) {
        saveProviders(nextProviders, messages, closeFlyout);
        return;
      }

      saveProviderFieldsThenKey(nextProviders, provider, accountKey, messages);
    },
    [closeFlyout, flyoutState, providers, saveProviderFieldsThenKey, saveProviderKey, saveProviders]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!providerToDelete) {
      return;
    }
    if (!providers.some(({ id }) => id === providerToDelete.id)) {
      setIsProviderGone(true);
      return;
    }
    saveProviders(
      providers.filter(({ id }) => id !== providerToDelete.id),
      {
        successMessage: getDeleteSuccessMessage(providerToDelete.id),
        errorTitle: DELETE_ERROR_TITLE,
      },
      closeDeleteModal
    );
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
        field: 'credentials',
        name: KEY_COLUMN_LABEL,
        render: (credentials: ExportProviderCredentials | undefined, { id }: ExportProvider) =>
          credentials ? (
            <span data-test-subj={`storageProvidersKeyColumn-${id}`}>{KEY_STORED_LABEL}</span>
          ) : (
            <EuiToolTip content={KEY_MISSING_TOOLTIP}>
              <span tabIndex={0} data-test-subj={`storageProvidersKeyColumn-${id}`}>
                {KEY_MISSING_LABEL}
              </span>
            </EuiToolTip>
          ),
      },
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
          errorMessage={dialogErrorMessage}
          keyErrorMessage={keyErrorMessage}
          isKeyOnlyRetry={isKeyOnlyRetry}
          onSave={handleFlyoutSave}
          onClose={closeFlyout}
        />
      )}
      {providerToDelete && (
        <DeleteStorageProviderModal
          provider={providerToDelete}
          isDeleting={isSaving}
          errorMessage={dialogErrorMessage}
          onConfirm={handleDeleteConfirm}
          onCancel={closeDeleteModal}
        />
      )}
    </div>
  );
});

StorageProvidersLayout.displayName = 'StorageProvidersLayout';
