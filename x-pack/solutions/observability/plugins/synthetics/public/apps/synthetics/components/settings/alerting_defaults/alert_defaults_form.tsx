/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { isEmpty, isEqual } from 'lodash';
import { hasInvalidEmail } from './validation';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants';
import { DefaultEmail } from './default_email';
import { selectDynamicSettings } from '../../../state/settings/selectors';
import {
  getDynamicSettingsAction,
  setDynamicSettingsAction,
} from '../../../state/settings/actions';
import { DefaultConnectorField } from './connector_field';
import type { DynamicSettings } from '../../../../../../common/runtime_types';
import { useAlertingDefaults } from './hooks/use_alerting_defaults';

interface FormFields extends Omit<DynamicSettings, 'defaultEmail'> {
  defaultEmail: Partial<DynamicSettings['defaultEmail']>;
}

export const AlertDefaultsForm = () => {
  const dispatch = useDispatch();

  const { settings, loading } = useSelector(selectDynamicSettings);

  const [formFields, setFormFields] = useState<FormFields>(DYNAMIC_SETTINGS_DEFAULTS as FormFields);

  const canEdit: boolean =
    !!useKibana().services?.application?.capabilities.uptime.configureSettings || false;

  const isDisabled = !canEdit;

  useEffect(() => {
    if (settings) {
      setFormFields(settings as FormFields);
    }
  }, [settings]);

  useEffect(() => {
    dispatch(getDynamicSettingsAction.get());
  }, [dispatch]);

  const { connectors } = useAlertingDefaults();

  const hasEmailConnector = connectors?.find(
    (connector) =>
      formFields.defaultConnectors?.includes(connector.id) && connector.actionTypeId === '.email'
  );

  const onApply = () => {
    dispatch(setDynamicSettingsAction.get(formFields as DynamicSettings));
  };

  const isFormDirty = !isEqual(formFields, settings);

  const isFormValid = () => {
    if (hasEmailConnector) {
      return isEmpty(hasInvalidEmail(formFields?.defaultConnectors, formFields?.defaultEmail));
    }
    return true;
  };

  return (
    <EuiForm>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.synthetics.settings.defaultConnectors"
              defaultMessage="Default rules"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.synthetics.settings.defaultConnectors.description"
            defaultMessage="Default rules are automatically created. You can disable creation of default rules here."
          />
        }
      >
        <EuiSpacer size="s" />
        <EuiSwitch
          label={i18n.translate('xpack.synthetics.ruleStatusDefaultsForm.euiSwitch.enabledLabel', {
            defaultMessage: 'Status rule enabled',
          })}
          checked={formFields?.defaultStatusRuleEnabled ?? true}
          onChange={() => {
            setFormFields({
              ...formFields,
              defaultStatusRuleEnabled: !(formFields.defaultStatusRuleEnabled ?? true),
            });
          }}
          disabled={isDisabled}
        />
        <EuiSpacer size="m" />
        <EuiSwitch
          label={i18n.translate('xpack.synthetics.ruleTLSDefaultsForm.euiSwitch.enabledLabel', {
            defaultMessage: 'TLS rule enabled',
          })}
          checked={formFields?.defaultTLSRuleEnabled ?? true}
          onChange={() => {
            setFormFields({
              ...formFields,
              defaultTLSRuleEnabled: !(formFields.defaultTLSRuleEnabled ?? true),
            });
          }}
          disabled={isDisabled}
        />
      </EuiDescribedFormGroup>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.synthetics.settings.defaultConnectors"
              defaultMessage="Default Connectors"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.synthetics.settings.defaultConnectors.description"
            defaultMessage="Select one or more connectors to be used for alerts. These settings apply to all synthetics-based alerts."
          />
        }
      >
        <DefaultConnectorField
          isDisabled={isDisabled}
          isLoading={loading}
          selectedConnectors={formFields.defaultConnectors}
          onChange={(value) => setFormFields({ ...formFields, defaultConnectors: value })}
        />
      </EuiDescribedFormGroup>
      {hasEmailConnector && (
        <DefaultEmail
          loading={loading}
          isDisabled={isDisabled}
          value={formFields.defaultEmail}
          selectedConnectors={formFields.defaultConnectors}
          onChange={(value) => setFormFields((prevStat) => ({ ...prevStat, defaultEmail: value }))}
        />
      )}
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.synthetics.settings.certThresholds"
              defaultMessage="Certificate thresholds"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.synthetics.settings.certThresholds.description"
            defaultMessage="Configure the thresholds used to determine certificate status on the Certificates page."
          />
        }
      >
        <EuiFormRow label={CERT_EXPIRATION_LABEL} helpText={CERT_EXPIRATION_HELP}>
          <EuiFieldNumber
            data-test-subj="syntheticsCertExpirationThreshold"
            value={formFields.certExpirationThreshold}
            onChange={(e) =>
              setFormFields({
                ...formFields,
                certExpirationThreshold: Number(e.target.value),
              })
            }
            min={1}
            disabled={isDisabled}
            append={DAYS_LABEL}
          />
        </EuiFormRow>
        <EuiFormRow label={CERT_AGE_LABEL} helpText={CERT_AGE_HELP}>
          <EuiFieldNumber
            data-test-subj="syntheticsCertAgeThreshold"
            value={formFields.certAgeThreshold}
            onChange={(e) =>
              setFormFields({
                ...formFields,
                certAgeThreshold: Number(e.target.value),
              })
            }
            min={1}
            disabled={isDisabled}
            append={DAYS_LABEL}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="syntheticsAlertDefaultsFormButton"
            iconType="cross"
            onClick={() => {
              setFormFields((settings ?? DYNAMIC_SETTINGS_DEFAULTS) as FormFields);
            }}
            flush="left"
            isDisabled={!isFormDirty}
            isLoading={loading}
          >
            {DISCARD_CHANGES}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="syntheticsAlertDefaultsFormButton"
            onClick={(evt: React.FormEvent) => {
              evt.preventDefault();
              onApply();
            }}
            fill
            isLoading={loading}
            isDisabled={!isFormDirty || isDisabled || !isFormValid()}
          >
            {APPLY_CHANGES}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

const DISCARD_CHANGES = i18n.translate('xpack.synthetics.settings.discardChanges', {
  defaultMessage: 'Discard changes',
});

const APPLY_CHANGES = i18n.translate('xpack.synthetics.settings.applyChanges', {
  defaultMessage: 'Apply changes',
});

const CERT_EXPIRATION_LABEL = i18n.translate(
  'xpack.synthetics.settings.certExpirationThreshold.label',
  { defaultMessage: 'Expiration warning threshold' }
);

const CERT_EXPIRATION_HELP = i18n.translate(
  'xpack.synthetics.settings.certExpirationThreshold.help',
  {
    defaultMessage:
      'Certificates expiring within this number of days will be shown as "Expiring soon".',
  }
);

const CERT_AGE_LABEL = i18n.translate('xpack.synthetics.settings.certAgeThreshold.label', {
  defaultMessage: 'Age limit',
});

const CERT_AGE_HELP = i18n.translate('xpack.synthetics.settings.certAgeThreshold.help', {
  defaultMessage: 'Certificates older than this number of days will be shown as "Too old".',
});

const DAYS_LABEL = i18n.translate('xpack.synthetics.settings.certThresholds.days', {
  defaultMessage: 'days',
});
