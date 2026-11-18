/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ExportProviderFieldError,
  ExportProviderFieldName,
} from '../../../../../../common/endpoint/service/response_actions/export_providers';
import {
  EXPORT_PROVIDER_ID_MAX_LENGTH,
  EXPORT_PROVIDER_SERVICE_URL_MAX_LENGTH,
  MAX_EXPORT_PROVIDERS_PER_POLICY,
} from '../../../../../../common/endpoint/service/response_actions/export_providers';
import type { ExportProviderType } from '../../../../../../common/endpoint/types';

export const STORAGE_PROVIDERS_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.tabLabel',
  { defaultMessage: 'Storage providers' }
);

export const STORAGE_PROVIDERS_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.title',
  { defaultMessage: 'Storage providers' }
);

export const STORAGE_PROVIDERS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.description',
  {
    defaultMessage:
      'Response actions can upload the files they collect to your own storage instead of Fleet. Storage providers apply to Windows, macOS, and Linux hosts using this policy.',
  }
);

export const EMPTY_STATE_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.emptyStateTitle',
  { defaultMessage: 'No storage providers' }
);

export const ADD_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.addButtonLabel',
  { defaultMessage: 'Add storage provider' }
);

export const MAX_PROVIDERS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.maxProvidersTooltip',
  {
    defaultMessage: 'A policy can have up to {max} storage providers. Delete one to add another.',
    values: { max: MAX_EXPORT_PROVIDERS_PER_POLICY },
  }
);

export const EXPORT_PROVIDER_TYPE_LABELS: Readonly<Record<ExportProviderType, string>> = {
  azure_blob: i18n.translate(
    'xpack.securitySolution.endpoint.policy.storageProviders.azureBlobTypeLabel',
    { defaultMessage: 'Azure Blob Storage' }
  ),
};

export const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.tableCaptionLabel',
  { defaultMessage: 'Storage providers of this policy' }
);

export const NAME_COLUMN_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.nameColumnLabel',
  { defaultMessage: 'Name' }
);

export const TYPE_COLUMN_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.typeColumnLabel',
  { defaultMessage: 'Type' }
);

export const ACCOUNT_NAME_COLUMN_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.accountNameColumnLabel',
  { defaultMessage: 'Storage account' }
);

export const CONTAINER_COLUMN_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.containerColumnLabel',
  { defaultMessage: 'Container' }
);

export const SERVICE_URL_COLUMN_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.serviceUrlColumnLabel',
  { defaultMessage: 'Service URL' }
);

export const DEFAULT_SERVICE_URL_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.defaultServiceUrlLabel',
  { defaultMessage: 'Default' }
);

export const ACTIONS_COLUMN_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.actionsColumnLabel',
  { defaultMessage: 'Actions' }
);

export const EDIT_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.editActionLabel',
  { defaultMessage: 'Edit' }
);

export const EDIT_ACTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.editActionDescription',
  { defaultMessage: 'Edit this storage provider' }
);

export const DELETE_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.deleteActionLabel',
  { defaultMessage: 'Delete' }
);

export const DELETE_ACTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.deleteActionDescription',
  { defaultMessage: 'Delete this storage provider' }
);

export const getAddSuccessMessage = (name: string): string =>
  i18n.translate('xpack.securitySolution.endpoint.policy.storageProviders.addSuccessToastTitle', {
    defaultMessage: 'Added storage provider {name}',
    values: { name },
  });

export const getEditSuccessMessage = (name: string): string =>
  i18n.translate('xpack.securitySolution.endpoint.policy.storageProviders.editSuccessToastTitle', {
    defaultMessage: 'Updated storage provider {name}',
    values: { name },
  });

export const getDeleteSuccessMessage = (name: string): string =>
  i18n.translate(
    'xpack.securitySolution.endpoint.policy.storageProviders.deleteSuccessToastTitle',
    {
      defaultMessage: 'Deleted storage provider {name}',
      values: { name },
    }
  );

// --- Add / edit flyout ---

export const CREATE_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.createTitle',
  { defaultMessage: 'Add storage provider' }
);

export const EDIT_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.editTitle',
  { defaultMessage: 'Edit storage provider' }
);

export const TYPE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.typeLabel',
  { defaultMessage: 'Type' }
);

export const NAME_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.nameLabel',
  { defaultMessage: 'Name' }
);

export const NAME_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.nameHelpDescription',
  {
    defaultMessage: 'Used in the response console as {exportArgument}.',
    values: { exportArgument: '--export <name>' },
  }
);

export const NAME_CHANGED_WARNING = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.nameChangedWarningDescription',
  { defaultMessage: "Exports to the old name that haven't reached a host yet will fail." }
);

export const DESTINATION_CHANGED_WARNING = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.destinationChangedWarningDescription',
  {
    defaultMessage:
      "Exports to this provider, including ones that haven't reached a host yet, will go to the new destination.",
  }
);

export const PROVIDER_CHANGED_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.providerChangedErrorMessage',
  { defaultMessage: 'This storage provider was changed or removed. Close and reopen it.' }
);

export const ACCOUNT_NAME_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.accountNameLabel',
  { defaultMessage: 'Storage account name' }
);

export const CONTAINER_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.containerLabel',
  { defaultMessage: 'Container' }
);

export const ADVANCED_SETTINGS_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.advancedSettingsLabel',
  { defaultMessage: 'Advanced settings' }
);

export const SERVICE_URL_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.serviceUrlLabel',
  { defaultMessage: 'Service URL' }
);

export const SERVICE_URL_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.serviceUrlPlaceholder',
  {
    defaultMessage: 'https://{accountName}.blob.core.windows.net',
    values: { accountName: '<account>' },
  }
);

export const SERVICE_URL_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.serviceUrlHelpDescription',
  {
    defaultMessage: "Optional. Leave empty to use the storage account's default endpoint.",
  }
);

export const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

export const CREATE_SUBMIT_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.createSubmitButtonLabel',
  { defaultMessage: 'Add storage provider' }
);

export const EDIT_SUBMIT_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.editSubmitButtonLabel',
  { defaultMessage: 'Save' }
);

export const SAVE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.saveErrorTitle',
  { defaultMessage: "Couldn't save the storage provider" }
);

// --- Field errors (codes from `getExportProviderFieldErrors`) ---

const FIELD_ERROR_MESSAGES: Readonly<
  Record<ExportProviderFieldName, Readonly<Partial<Record<ExportProviderFieldError, string>>>>
> = {
  id: {
    required: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.nameRequiredErrorMessage',
      { defaultMessage: 'Enter a name.' }
    ),
    too_long: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.nameTooLongErrorMessage',
      {
        defaultMessage: 'Use at most {max} characters.',
        values: { max: EXPORT_PROVIDER_ID_MAX_LENGTH },
      }
    ),
    invalid_format: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.nameInvalidErrorMessage',
      {
        defaultMessage:
          'Use only letters, digits, underscores (_), and hyphens (-), without spaces.',
      }
    ),
    duplicate: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.nameDuplicateErrorMessage',
      { defaultMessage: 'This policy already has a storage provider with this name.' }
    ),
  },
  type: {
    required: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.typeRequiredErrorMessage',
      { defaultMessage: 'Select a type.' }
    ),
    unsupported: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.typeUnsupportedErrorMessage',
      { defaultMessage: 'Select a supported type.' }
    ),
  },
  account_name: {
    required: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.accountNameRequiredErrorMessage',
      { defaultMessage: 'Enter a storage account name.' }
    ),
    invalid_format: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.accountNameInvalidErrorMessage',
      { defaultMessage: 'Use 3-24 lowercase letters and digits, without spaces.' }
    ),
  },
  container: {
    required: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.containerRequiredErrorMessage',
      { defaultMessage: 'Enter a container name.' }
    ),
    invalid_format: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.containerInvalidErrorMessage',
      {
        defaultMessage:
          'Use 3-63 lowercase letters, digits, and single hyphens (-), starting and ending with a letter or digit.',
      }
    ),
  },
  service_url: {
    too_long: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.serviceUrlTooLongErrorMessage',
      {
        defaultMessage: 'Use at most {max} characters.',
        values: { max: EXPORT_PROVIDER_SERVICE_URL_MAX_LENGTH },
      }
    ),
    invalid_format: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.serviceUrlInvalidErrorMessage',
      {
        defaultMessage:
          'Enter a URL that starts with https://, uses only ASCII letters, digits and symbols, and has no spaces, credentials (@), query (?), fragment (#), or backslashes (\\).',
      }
    ),
    not_https: i18n.translate(
      'xpack.securitySolution.endpoint.policy.storageProviders.flyout.serviceUrlNotHttpsErrorMessage',
      { defaultMessage: 'Use a URL that starts with https://.' }
    ),
  },
};

/** Fallback for a field/code pair that `getExportProviderFieldErrors` doesn't produce today */
const INVALID_VALUE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.flyout.invalidValueErrorMessage',
  { defaultMessage: 'Enter a valid value.' }
);

/** The message shown under a form field for an error code from `getExportProviderFieldErrors`. */
export const getFieldErrorMessage = (
  field: ExportProviderFieldName,
  error: ExportProviderFieldError
): string => FIELD_ERROR_MESSAGES[field][error] ?? INVALID_VALUE_ERROR_MESSAGE;

// --- Delete modal ---

export const getDeleteModalTitle = (name: string): string =>
  i18n.translate('xpack.securitySolution.endpoint.policy.storageProviders.deleteModal.title', {
    defaultMessage: 'Delete storage provider {name}?',
    values: { name },
  });

export const DELETE_MODAL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.deleteModal.description',
  { defaultMessage: "Exports to this provider that haven't reached a host yet will fail." }
);

export const DELETE_MODAL_CONFIRM_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.deleteModal.confirmButtonLabel',
  { defaultMessage: 'Delete' }
);

export const DELETE_MODAL_CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.deleteModal.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

export const DELETE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.storageProviders.deleteModal.errorTitle',
  { defaultMessage: "Couldn't delete the storage provider" }
);
