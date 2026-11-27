/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { isEqual } from 'lodash';
import type { ExportProviderFieldName } from '../../../../../../common/endpoint/service/response_actions/export_providers';
import {
  EXPORT_PROVIDER_TYPES,
  getExportProviderFieldErrors,
} from '../../../../../../common/endpoint/service/response_actions/export_providers';
import type { ExportProvider, ExportProviderType } from '../../../../../../common/endpoint/types';
import {
  ACCOUNT_NAME_FIELD_LABEL,
  ADVANCED_SETTINGS_LABEL,
  CANCEL_BUTTON_LABEL,
  CONTAINER_FIELD_LABEL,
  CREATE_FLYOUT_TITLE,
  CREATE_SUBMIT_BUTTON_LABEL,
  DESTINATION_CHANGED_WARNING,
  EDIT_FLYOUT_TITLE,
  EDIT_SUBMIT_BUTTON_LABEL,
  EXPORT_PROVIDER_TYPE_LABELS,
  getFieldErrorMessage,
  NAME_CHANGED_WARNING,
  NAME_FIELD_HELP_TEXT,
  NAME_FIELD_LABEL,
  SAVE_ERROR_TITLE,
  SERVICE_URL_FIELD_HELP_TEXT,
  SERVICE_URL_FIELD_LABEL,
  SERVICE_URL_FIELD_PLACEHOLDER,
  TYPE_FIELD_LABEL,
} from './translations';

/** Raw input values; validated as typed (no trimming) */
interface StorageProviderFormValues {
  type: ExportProviderType;
  id: string;
  account_name: string;
  container: string;
  /** `''` means "not set": the key is left out of the saved provider */
  service_url: string;
}

const TYPE_OPTIONS = EXPORT_PROVIDER_TYPES.map((type) => ({
  value: type,
  text: EXPORT_PROVIDER_TYPE_LABELS[type],
}));

const isExportProviderType = (value: string): value is ExportProviderType =>
  (EXPORT_PROVIDER_TYPES as readonly string[]).includes(value);

const toFormValues = (provider?: ExportProvider): StorageProviderFormValues => ({
  type: provider?.type ?? EXPORT_PROVIDER_TYPES[0],
  id: provider?.id ?? '',
  account_name: provider?.account_name ?? '',
  container: provider?.container ?? '',
  service_url: provider?.service_url ?? '',
});

const toExportProvider = ({
  service_url: serviceUrl,
  ...values
}: StorageProviderFormValues): ExportProvider => ({
  ...values,
  // The server rejects `''`, so an empty field means "use the default"
  ...(serviceUrl !== '' ? { service_url: serviceUrl } : {}),
});

/** A field's help text, followed by `warning` (if any) on its own line in the warning colour */
const withWarning = (
  helpText: string | undefined,
  warning: string | undefined,
  warningTestSubj: string
): ReactNode => {
  if (!warning) {
    return helpText;
  }
  const warningLine = (
    <EuiTextColor key="warning" color="warning" data-test-subj={warningTestSubj}>
      {warning}
    </EuiTextColor>
  );
  return helpText ? [helpText, warningLine] : warningLine;
};

export interface StorageProviderFlyoutProps {
  /** The provider to edit; omitted when adding one */
  provider?: ExportProvider;
  /** The `id`s of the policy's other providers, for the uniqueness check */
  otherIds: readonly string[];
  isSaving: boolean;
  /** The server's message when the last policy update failed */
  errorMessage?: string;
  onSave: (provider: ExportProvider) => void;
  onClose: () => void;
}

/**
 * Add or edit one storage provider. Renaming changes the `id` in place; the type can't be changed
 * once the provider exists.
 */
export const StorageProviderFlyout = memo<StorageProviderFlyoutProps>(
  ({ provider, otherIds, isSaving, errorMessage, onSave, onClose }) => {
    const isEdit = provider !== undefined;
    const titleId = useGeneratedHtmlId();
    const advancedSettingsId = useGeneratedHtmlId();

    const [values, setValues] = useState<StorageProviderFormValues>(() => toFormValues(provider));
    // Field errors show once the user has left the field
    const [touched, setTouched] = useState<Partial<Record<ExportProviderFieldName, boolean>>>({});

    const updatedProvider = useMemo(() => toExportProvider(values), [values]);
    const fieldErrors = useMemo(
      () => getExportProviderFieldErrors(updatedProvider, otherIds),
      [otherIds, updatedProvider]
    );
    const isValid = Object.keys(fieldErrors).length === 0;
    const isChanged = !isEdit || !isEqual(updatedProvider, provider);
    const canSave = isValid && isChanged && !isSaving;
    const isRenamed = isEdit && values.id !== provider.id;
    // Account, container and service URL are where exports to this name go; a change also
    // redirects exports that haven't reached a host yet
    const isAccountNameChanged = isEdit && values.account_name !== provider.account_name;
    const isContainerChanged = isEdit && values.container !== provider.container;
    const isServiceUrlChanged = isEdit && values.service_url !== (provider.service_url ?? '');

    const getVisibleError = (field: ExportProviderFieldName): string | undefined => {
      const error = fieldErrors[field];
      return touched[field] && error ? getFieldErrorMessage(field, error) : undefined;
    };

    const handleTextChange = useCallback(
      (field: Exclude<ExportProviderFieldName, 'type'>) =>
        ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
          setValues((prev) => ({ ...prev, [field]: value }));
        },
      []
    );

    const handleTypeChange = useCallback(
      ({ target: { value } }: ChangeEvent<HTMLSelectElement>) => {
        if (isExportProviderType(value)) {
          setValues((prev) => ({ ...prev, type: value }));
        }
      },
      []
    );

    const handleBlur = useCallback(
      (field: ExportProviderFieldName) => () => {
        setTouched((prev) => ({ ...prev, [field]: true }));
      },
      []
    );

    const handleSave = useCallback(() => {
      if (canSave) {
        onSave(updatedProvider);
      }
    }, [canSave, onSave, updatedProvider]);

    const handleClose = useCallback(() => {
      if (!isSaving) {
        onClose();
      }
    }, [isSaving, onClose]);

    const typeError = getVisibleError('type');
    const nameError = getVisibleError('id');
    const accountNameError = getVisibleError('account_name');
    const containerError = getVisibleError('container');
    const serviceUrlError = getVisibleError('service_url');

    return (
      <EuiFlyout
        session="never"
        size="m"
        onClose={handleClose}
        aria-labelledby={titleId}
        data-test-subj="storageProviderFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>{isEdit ? EDIT_FLYOUT_TITLE : CREATE_FLYOUT_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {errorMessage && (
            <>
              <KbnDangerCallout
                announceOnMount
                size="s"
                title={SAVE_ERROR_TITLE}
                text={errorMessage}
                data-test-subj="storageProviderFlyout-saveError"
              />
              <EuiSpacer size="m" />
            </>
          )}
          <EuiForm>
            <EuiFormRow
              label={TYPE_FIELD_LABEL}
              isInvalid={Boolean(typeError)}
              error={typeError}
              fullWidth
            >
              <EuiSelect
                options={TYPE_OPTIONS}
                value={values.type}
                onChange={handleTypeChange}
                onBlur={handleBlur('type')}
                disabled={isEdit || isSaving}
                isInvalid={Boolean(typeError)}
                fullWidth
                data-test-subj="storageProviderFlyout-typeSelect"
              />
            </EuiFormRow>
            <EuiFormRow
              label={NAME_FIELD_LABEL}
              helpText={withWarning(
                NAME_FIELD_HELP_TEXT,
                isRenamed ? NAME_CHANGED_WARNING : undefined,
                'storageProviderFlyout-nameChangedWarning'
              )}
              isInvalid={Boolean(nameError)}
              error={nameError}
              fullWidth
            >
              <EuiFieldText
                value={values.id}
                onChange={handleTextChange('id')}
                onBlur={handleBlur('id')}
                disabled={isSaving}
                isInvalid={Boolean(nameError)}
                fullWidth
                data-test-subj="storageProviderFlyout-nameInput"
              />
            </EuiFormRow>
            <EuiFormRow
              data-test-subj="storageProviderFlyout-accountNameRow"
              label={ACCOUNT_NAME_FIELD_LABEL}
              helpText={withWarning(
                undefined,
                isAccountNameChanged ? DESTINATION_CHANGED_WARNING : undefined,
                'storageProviderFlyout-destinationChangedWarning'
              )}
              isInvalid={Boolean(accountNameError)}
              error={accountNameError}
              fullWidth
            >
              <EuiFieldText
                value={values.account_name}
                onChange={handleTextChange('account_name')}
                onBlur={handleBlur('account_name')}
                disabled={isSaving}
                isInvalid={Boolean(accountNameError)}
                fullWidth
                data-test-subj="storageProviderFlyout-accountNameInput"
              />
            </EuiFormRow>
            <EuiFormRow
              data-test-subj="storageProviderFlyout-containerRow"
              label={CONTAINER_FIELD_LABEL}
              helpText={withWarning(
                undefined,
                isContainerChanged ? DESTINATION_CHANGED_WARNING : undefined,
                'storageProviderFlyout-destinationChangedWarning'
              )}
              isInvalid={Boolean(containerError)}
              error={containerError}
              fullWidth
            >
              <EuiFieldText
                value={values.container}
                onChange={handleTextChange('container')}
                onBlur={handleBlur('container')}
                disabled={isSaving}
                isInvalid={Boolean(containerError)}
                fullWidth
                data-test-subj="storageProviderFlyout-containerInput"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiAccordion
              id={advancedSettingsId}
              buttonContent={ADVANCED_SETTINGS_LABEL}
              buttonProps={{ 'data-test-subj': 'storageProviderFlyout-advancedSettingsToggle' }}
              initialIsOpen={values.service_url !== ''}
              // Keep an invalid URL visible: Save stays disabled until it's fixed
              forceState={serviceUrlError ? 'open' : undefined}
              data-test-subj="storageProviderFlyout-advancedSettings"
            >
              <EuiSpacer size="s" />
              <EuiFormRow
                data-test-subj="storageProviderFlyout-serviceUrlRow"
                label={SERVICE_URL_FIELD_LABEL}
                helpText={withWarning(
                  SERVICE_URL_FIELD_HELP_TEXT,
                  isServiceUrlChanged ? DESTINATION_CHANGED_WARNING : undefined,
                  'storageProviderFlyout-destinationChangedWarning'
                )}
                isInvalid={Boolean(serviceUrlError)}
                error={serviceUrlError}
                fullWidth
              >
                <EuiFieldText
                  value={values.service_url}
                  placeholder={SERVICE_URL_FIELD_PLACEHOLDER}
                  onChange={handleTextChange('service_url')}
                  onBlur={handleBlur('service_url')}
                  disabled={isSaving}
                  isInvalid={Boolean(serviceUrlError)}
                  fullWidth
                  data-test-subj="storageProviderFlyout-serviceUrlInput"
                />
              </EuiFormRow>
            </EuiAccordion>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={handleClose}
                disabled={isSaving}
                data-test-subj="storageProviderFlyout-cancelButton"
              >
                {CANCEL_BUTTON_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleSave}
                disabled={!canSave}
                isLoading={isSaving}
                data-test-subj="storageProviderFlyout-saveButton"
              >
                {isEdit ? EDIT_SUBMIT_BUTTON_LABEL : CREATE_SUBMIT_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

StorageProviderFlyout.displayName = 'StorageProviderFlyout';
