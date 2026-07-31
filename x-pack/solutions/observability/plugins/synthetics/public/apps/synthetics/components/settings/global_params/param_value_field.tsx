/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiCode,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import React from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { OptionalText } from '../components/optional_text';
import type { ListParamItem } from './params_list';
import type { ParamFormData, ParamValueSourceType } from './add_param_form';
import { VALUE_LABEL, VALUE_REQUIRED } from './add_param_form';

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

  if (isEditingItem) {
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
        <EuiCallOut
          announceOnMount
          size="s"
          title={i18n.translate('xpack.synthetics.paramValueField.euiCallOut.newValue', {
            defaultMessage:
              'Assign a new value to update this parameter, or leave blank to keep the current value.',
          })}
          iconType="info"
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
  const { register } = useFormContext<ParamFormData>();
  const { errors } = useFormState<ParamFormData>();

  return (
    <>
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
          })}
        />
      </EuiFormRow>
      <EuiSpacer size="xs" />
      <EuiCallOut
        announceOnMount
        size="s"
        iconType="lock"
        title={i18n.translate('xpack.synthetics.paramValueField.vaultCallout', {
          defaultMessage:
            'The secret is resolved at runtime by the agent (Heartbeat) from HashiCorp Vault. Kibana stores only this reference and never the plaintext secret.',
        })}
      >
        <EuiCode>{'${vault/<path>#<field>}'}</EuiCode>
      </EuiCallOut>
    </>
  );
};

export const NEW_VALUE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.paramForm.newValue',
  {
    defaultMessage: 'New value',
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
