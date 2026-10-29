/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCode,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { OptionalText } from '../components/optional_text';
import type { ListParamItem } from './params_list';
import type { ParamFormData, ParamValueSourceType } from './add_param_form';
import { VALUE_LABEL, VALUE_REQUIRED } from './add_param_form';
import {
  isValidVaultField,
  isValidVaultPath,
  parseVaultReference,
} from '../../../../../../common/lib/vault_reference';
import type { SecretConnectionStatus } from '../../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';

export const ParamValueField = ({
  isEditingItem,
  sourceType,
}: {
  isEditingItem: ListParamItem | null;
  sourceType: ParamValueSourceType;
}) => {
  const { register } = useFormContext<ParamFormData>();
  const { errors } = useFormState<ParamFormData>();

  if (sourceType === 'vault') {
    return <VaultSourceFields />;
  }

  // Switching a Vault-backed param to a literal needs a new value; blank would keep the reference.
  const hasStoredValue = isEditingItem && !parseVaultReference(isEditingItem.value);

  if (hasStoredValue) {
    return (
      <>
        <EuiFormRow
          fullWidth
          label={NEW_VALUE_LABEL}
          isInvalid={Boolean(errors?.value)}
          error={errors?.value?.message}
          labelAppend={<OptionalText />}
        >
          <EuiTextArea
            isInvalid={Boolean(errors?.value)}
            data-test-subj="syntheticsAddParamFormTextArea"
            fullWidth
            aria-label={NEW_VALUE_LABEL}
            {...register('value')}
          />
        </EuiFormRow>
        <EuiSpacer size="xs" />
        <KbnInfoCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.synthetics.paramValueField.euiCallOut.newValue', {
            defaultMessage:
              'Assign a new value to update this parameter, or leave blank to keep the current value.',
          })}
        />
      </>
    );
  }

  return (
    <EuiFormRow
      fullWidth
      label={VALUE_LABEL}
      isInvalid={Boolean(errors?.value)}
      error={errors?.value?.message}
    >
      <EuiTextArea
        isInvalid={Boolean(errors?.value)}
        data-test-subj="syntheticsAddParamFormTextArea"
        fullWidth
        aria-label={VALUE_LABEL}
        {...register('value', {
          required: {
            value: true,
            message: VALUE_REQUIRED,
          },
        })}
      />
    </EuiFormRow>
  );
};

const VaultSourceFields = () => {
  const { register, getValues, setValue, watch } = useFormContext<ParamFormData>();
  const { errors } = useFormState<ParamFormData>();
  const { http } = useKibana().services;
  const [connections, setConnections] = useState<string[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const selected = watch('source.connection');

  useEffect(() => {
    setLoadFailed(false);
    http
      ?.get<SecretConnectionStatus[]>(SYNTHETICS_API_URLS.SECRET_CONNECTION)
      .then((res) => {
        const names = (Array.isArray(res) ? res : []).map((c) => c.name ?? '');
        setConnections(names);
        // With a single connection there is nothing to choose.
        if (names.length === 1 && !getValues('source.connection')) {
          setValue('source.connection', names[0]);
        }
      })
      .catch(() => setLoadFailed(true));
  }, [http, getValues, setValue, attempt]);

  // A stored connection stays selectable even when the list lacks it (still loading or gone).
  const names =
    selected && !connections.includes(selected) ? [...connections, selected] : connections;
  const connectionError = errors?.source?.connection?.message;

  return (
    <>
      <EuiFormRow
        fullWidth
        label={SECRET_CONNECTION_LABEL}
        helpText={SECRET_CONNECTION_HELP}
        isInvalid={Boolean(connectionError) || loadFailed}
        error={
          loadFailed ? (
            <>
              {VAULT_CONNECTIONS_LOAD_FAILED}{' '}
              <EuiLink
                data-test-subj="syntheticsParamSecretConnectionRetry"
                onClick={() => setAttempt((n) => n + 1)}
              >
                {VAULT_CONNECTIONS_RETRY}
              </EuiLink>
            </>
          ) : (
            connectionError
          )
        }
      >
        <EuiSelect
          fullWidth
          isInvalid={Boolean(connectionError) || loadFailed}
          data-test-subj="syntheticsParamSecretConnection"
          options={[
            { value: '', text: VAULT_SELECT_CONNECTION },
            ...names.map((n) => ({ value: n, text: n })),
          ]}
          value={selected ?? ''}
          {...register('source.connection', {
            required: { value: true, message: VAULT_CONNECTION_REQUIRED },
          })}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={VAULT_PATH_LABEL}
        helpText={VAULT_PATH_HELP}
        isInvalid={Boolean(errors?.source?.path)}
        error={errors?.source?.path?.message}
      >
        <EuiFieldText
          isInvalid={Boolean(errors?.source?.path)}
          data-test-subj="syntheticsParamVaultPath"
          fullWidth
          placeholder="myapp/creds"
          aria-label={VAULT_PATH_LABEL}
          {...register('source.path', {
            required: { value: true, message: VAULT_PATH_REQUIRED },
            validate: (value) => isValidVaultPath(value ?? '') || VAULT_PATH_INVALID,
          })}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={VAULT_FIELD_LABEL}
        helpText={VAULT_FIELD_HELP}
        isInvalid={Boolean(errors?.source?.field)}
        error={errors?.source?.field?.message}
      >
        <EuiFieldText
          isInvalid={Boolean(errors?.source?.field)}
          data-test-subj="syntheticsParamVaultField"
          fullWidth
          placeholder="password"
          aria-label={VAULT_FIELD_LABEL}
          {...register('source.field', {
            required: { value: true, message: VAULT_FIELD_REQUIRED },
            validate: (value) => isValidVaultField(value ?? '') || VAULT_FIELD_INVALID,
          })}
        />
      </EuiFormRow>
      <EuiSpacer size="xs" />
      <KbnInfoCallout
        announceOnMount
        size="s"
        title={i18n.translate('xpack.synthetics.paramValueField.vaultCallout', {
          defaultMessage:
            'The secret is resolved at runtime by the agent (Heartbeat) from HashiCorp Vault, so it only applies to monitors on private locations. Kibana stores only this reference and never the plaintext secret.',
        })}
      >
        <EuiCode>{'vault://<connection>@<path>#<field>'}</EuiCode>
      </KbnInfoCallout>
    </>
  );
};

export const NEW_VALUE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.paramForm.newValue',
  {
    defaultMessage: 'New value',
  }
);

const SECRET_CONNECTION_LABEL = i18n.translate('xpack.synthetics.paramForm.secretConnectionLabel', {
  defaultMessage: 'Vault connection',
});
const SECRET_CONNECTION_HELP = i18n.translate('xpack.synthetics.paramForm.secretConnectionHelp', {
  defaultMessage: 'Which configured Vault connection to resolve this secret from.',
});
const VAULT_SELECT_CONNECTION = i18n.translate('xpack.synthetics.paramForm.vaultSelectConnection', {
  defaultMessage: 'Select a connection',
});
const VAULT_CONNECTION_REQUIRED = i18n.translate(
  'xpack.synthetics.paramForm.vaultConnectionRequired',
  {
    defaultMessage: 'A Vault connection is required',
  }
);
const VAULT_PATH_LABEL = i18n.translate('xpack.synthetics.paramForm.vaultPathLabel', {
  defaultMessage: 'Vault secret path',
});

const VAULT_PATH_HELP = i18n.translate('xpack.synthetics.paramForm.vaultPathHelp', {
  defaultMessage: 'KV v2 secret path, e.g. myapp/creds',
});

const VAULT_FIELD_LABEL = i18n.translate('xpack.synthetics.paramForm.vaultFieldLabel', {
  defaultMessage: 'Vault secret field',
});

const VAULT_FIELD_HELP = i18n.translate('xpack.synthetics.paramForm.vaultFieldHelp', {
  defaultMessage: 'Key within the secret, e.g. password',
});

const VAULT_PATH_REQUIRED = i18n.translate('xpack.synthetics.paramForm.vaultPathRequired', {
  defaultMessage: 'Vault secret path is required',
});

const VAULT_FIELD_REQUIRED = i18n.translate('xpack.synthetics.paramForm.vaultFieldRequired', {
  defaultMessage: 'Vault secret field is required',
});

const VAULT_PATH_INVALID = i18n.translate('xpack.synthetics.paramForm.vaultPathInvalid', {
  defaultMessage: 'Use only letters, numbers, ".", "_", "-" and "/" in the secret path',
});

const VAULT_FIELD_INVALID = i18n.translate('xpack.synthetics.paramForm.vaultFieldInvalid', {
  defaultMessage: 'Use only letters, numbers, ".", "_" and "-" in the secret field',
});

const VAULT_CONNECTIONS_LOAD_FAILED = i18n.translate(
  'xpack.synthetics.paramForm.vaultConnectionsLoadFailed',
  {
    defaultMessage: 'Could not load the Vault connections.',
  }
);

const VAULT_CONNECTIONS_RETRY = i18n.translate('xpack.synthetics.paramForm.vaultConnectionsRetry', {
  defaultMessage: 'Retry',
});
