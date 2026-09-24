/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  MAX_SANDBOX_SECRETS,
  MIN_SANDBOX_SECRET_VALUE_LENGTH,
  validateSandboxSecretKey,
  type SandboxSecretEntry,
} from '@kbn/nightshift-investigations-plugin/common';
import { useFetchSandboxSecrets } from './use_fetch_sandbox_secrets';
import { useSaveSandboxSecrets } from './use_save_sandbox_secrets';

interface SecretRow {
  id: string;
  key: string;
  /** Key under which a value is already stored; absent for rows added in this session. */
  storedKey?: string;
  value: string;
}

const hasStoredValue = ({ key, storedKey }: SecretRow): boolean =>
  storedKey !== undefined && key === storedKey;

const getKeyError = (row: SecretRow, rows: readonly SecretRow[]): string | undefined => {
  if (validateSandboxSecretKey(row.key) !== undefined) {
    return i18n.translate('xpack.nightshift.sandboxSecrets.invalidKeyError', {
      defaultMessage:
        'Use upper-case letters, digits and underscores, not starting with a digit. PATH, HOME, USER, SHELL, PWD and CONNECTOR_* are reserved.',
    });
  }
  if (rows.some((other) => other.id !== row.id && other.key === row.key)) {
    return i18n.translate('xpack.nightshift.sandboxSecrets.duplicateKeyError', {
      defaultMessage: 'This name is already used.',
    });
  }
  return undefined;
};

const getValueError = (row: SecretRow): string | undefined => {
  if (row.value === '') {
    return hasStoredValue(row)
      ? undefined
      : i18n.translate('xpack.nightshift.sandboxSecrets.valueRequiredError', {
          defaultMessage: 'Enter a value for this secret.',
        });
  }
  return row.value.length < MIN_SANDBOX_SECRET_VALUE_LENGTH
    ? i18n.translate('xpack.nightshift.sandboxSecrets.valueTooShortError', {
        defaultMessage: 'Use at least {minLength} characters.',
        values: { minLength: MIN_SANDBOX_SECRET_VALUE_LENGTH },
      })
    : undefined;
};

const toEntries = (rows: readonly SecretRow[]): SandboxSecretEntry[] =>
  rows.map((row) =>
    row.value === '' && hasStoredValue(row) ? { key: row.key } : { key: row.key, value: row.value }
  );

const keyLabel = i18n.translate('xpack.nightshift.sandboxSecrets.keyLabel', {
  defaultMessage: 'Name',
});
const valueLabel = i18n.translate('xpack.nightshift.sandboxSecrets.valueLabel', {
  defaultMessage: 'Value',
});
const storedValuePlaceholder = i18n.translate(
  'xpack.nightshift.sandboxSecrets.storedValuePlaceholder',
  { defaultMessage: 'Stored value hidden. Enter a new value to replace it.' }
);
const newValuePlaceholder = i18n.translate('xpack.nightshift.sandboxSecrets.newValuePlaceholder', {
  defaultMessage: 'Secret value',
});

function SandboxSecretsForm({
  initialKeys,
  version,
  canEncrypt,
  onClose,
}: {
  initialKeys: readonly string[];
  version?: string;
  canEncrypt: boolean;
  onClose: () => void;
}): React.ReactElement {
  const nextRowId = useRef(0);
  const createRowId = () => `row-${nextRowId.current++}`;
  const [rows, setRows] = useState<SecretRow[]>(() =>
    initialKeys.map((key) => ({ id: createRowId(), key, storedKey: key, value: '' }))
  );
  const [showErrors, setShowErrors] = useState(false);
  const { mutate: save, isLoading: isSaving } = useSaveSandboxSecrets({ onSuccess: onClose });

  const updateRow = useCallback((id: string, patch: Partial<Pick<SecretRow, 'key' | 'value'>>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const hasErrors = useMemo(
    () => rows.some((row) => getKeyError(row, rows) || getValueError(row)),
    [rows]
  );

  const onSave = () => {
    setShowErrors(true);
    if (hasErrors) return;
    save({ entries: toEntries(rows), version });
  };

  const isDisabled = !canEncrypt || isSaving;

  return (
    <>
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.nightshift.sandboxSecrets.description', {
              defaultMessage:
                'Secrets are available to sandbox commands in this space as environment variables. An agent must request each secret by name for every command. Stored values can be replaced or removed, but never displayed.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {!canEncrypt && (
          <>
            <KbnWarningCallout
              size="s"
              data-test-subj="nightshiftSandboxSecretsCannotEncrypt"
              title={i18n.translate('xpack.nightshift.sandboxSecrets.cannotEncryptTitle', {
                defaultMessage:
                  'Sandbox secrets require an encryption key. Set xpack.encryptedSavedObjects.encryptionKey to enable them.',
              })}
            />
            <EuiSpacer size="m" />
          </>
        )}
        {rows.length === 0 && (
          <EuiText size="s" data-test-subj="nightshiftSandboxSecretsEmpty">
            <p>
              {i18n.translate('xpack.nightshift.sandboxSecrets.empty', {
                defaultMessage: 'No secrets are configured in this space.',
              })}
            </p>
          </EuiText>
        )}
        <EuiFlexGroup direction="column" gutterSize="m">
          {rows.map((row) => {
            const keyError = showErrors ? getKeyError(row, rows) : undefined;
            const valueError = showErrors ? getValueError(row) : undefined;
            const removeLabel = i18n.translate('xpack.nightshift.sandboxSecrets.removeAriaLabel', {
              defaultMessage: 'Remove secret {key}',
              values: { key: row.key },
            });
            return (
              <EuiFlexGroup
                key={row.id}
                gutterSize="s"
                alignItems="flexStart"
                data-test-subj="nightshiftSandboxSecretRow"
              >
                <EuiFlexItem>
                  <EuiFormRow label={keyLabel} isInvalid={!!keyError} error={keyError}>
                    <EuiFieldText
                      value={row.key}
                      isInvalid={!!keyError}
                      disabled={isDisabled}
                      onChange={(e) => updateRow(row.id, { key: e.target.value })}
                      data-test-subj="nightshiftSandboxSecretKey"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow label={valueLabel} isInvalid={!!valueError} error={valueError}>
                    <EuiFieldPassword
                      type="dual"
                      value={row.value}
                      autoComplete="new-password"
                      placeholder={
                        hasStoredValue(row) ? storedValuePlaceholder : newValuePlaceholder
                      }
                      isInvalid={!!valueError}
                      disabled={isDisabled}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      data-test-subj="nightshiftSandboxSecretValue"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow hasEmptyLabelSpace>
                    <EuiToolTip content={removeLabel} disableScreenReaderOutput>
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        size="m"
                        disabled={isDisabled}
                        aria-label={removeLabel}
                        onClick={() =>
                          setRows((current) => current.filter(({ id }) => id !== row.id))
                        }
                        data-test-subj="nightshiftSandboxSecretRemove"
                      />
                    </EuiToolTip>
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          })}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          iconType="plus"
          size="s"
          disabled={isDisabled || rows.length >= MAX_SANDBOX_SECRETS}
          onClick={() =>
            setRows((current) => [...current, { id: createRowId(), key: '', value: '' }])
          }
          data-test-subj="nightshiftSandboxSecretsAdd"
        >
          {i18n.translate('xpack.nightshift.sandboxSecrets.addButton', {
            defaultMessage: 'Add secret',
          })}
        </EuiButtonEmpty>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="nightshiftSandboxSecretsCancel">
              {i18n.translate('xpack.nightshift.sandboxSecrets.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onSave}
              isLoading={isSaving}
              isDisabled={!canEncrypt || (showErrors && hasErrors)}
              data-test-subj="nightshiftSandboxSecretsSave"
            >
              {i18n.translate('xpack.nightshift.sandboxSecrets.saveButton', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}

export function SandboxSecretsFlyout({ onClose }: { onClose: () => void }): React.ReactElement {
  const titleId = useGeneratedHtmlId({ prefix: 'nightshiftSandboxSecretsTitle' });
  const { data, error, isLoading } = useFetchSandboxSecrets();

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      ownFocus
      data-test-subj="nightshiftSandboxSecretsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {i18n.translate('xpack.nightshift.sandboxSecrets.flyoutTitle', {
              defaultMessage: 'Sandbox secrets',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {isLoading && (
        <EuiFlyoutBody>
          <EuiLoadingSpinner size="l" />
        </EuiFlyoutBody>
      )}
      {error && (
        <EuiFlyoutBody>
          <KbnDangerCallout
            size="s"
            data-test-subj="nightshiftSandboxSecretsLoadError"
            title={i18n.translate('xpack.nightshift.sandboxSecrets.loadErrorTitle', {
              defaultMessage: 'Failed to load sandbox secrets',
            })}
            text={error.message}
          />
        </EuiFlyoutBody>
      )}
      {data && (
        <SandboxSecretsForm
          // Remount when the stored secrets change (save or conflict reload) to reset the rows.
          key={data.version ?? 'empty'}
          initialKeys={data.keys}
          version={data.version}
          canEncrypt={data.canEncrypt}
          onClose={onClose}
        />
      )}
    </EuiFlyout>
  );
}
