/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';
import { getSchema } from './schema';
import type { AttackDiscoveryScheduleSchema } from './types';

import { ConnectorSelectorField } from '../form_fields/connector_selector_field';
import { ScheduleField } from '../form_fields/schedule_field';
import { useSettingsView } from '../../hooks/use_settings_view';
import type { AlertsSelectionSettings } from '../../types';
import { RuleActionsField } from '../../../../../common/components/rule_actions_field';
import { useKibana } from '../../../../../common/lib/kibana';
import type { FormHook } from '../../../../../shared_imports';
import {
  Field,
  Form,
  UseField,
  getUseField,
  useForm,
  useFormData,
} from '../../../../../shared_imports';
import { getMessageVariables } from './message_variables';

const CommonUseField = getUseField({ component: Field });

export interface FormState {
  value: AttackDiscoveryScheduleSchema;
  isValid?: boolean;
  submit: FormHook<AttackDiscoveryScheduleSchema>['submit'];
}

export interface FormProps {
  initialValue: AttackDiscoveryScheduleSchema;
  onChange: (state: FormState) => void;
}

export const EditForm: React.FC<FormProps> = React.memo((props) => {
  const { initialValue, onChange } = props;
  const {
    triggersActionsUi: { actionTypeRegistry },
  } = useKibana().services;

  const { form } = useForm<AttackDiscoveryScheduleSchema>({
    defaultValue: initialValue,
    options: { stripEmptyFields: false },
    schema: getSchema({ actionTypeRegistry }),
  });

  const [{ value }] = useFormData<{ value: AttackDiscoveryScheduleSchema }>({ form });
  const { isValid, setFieldValue, submit } = form;

  useEffect(() => {
    onChange({
      value,
      isValid,
      submit,
    });
  }, [isValid, onChange, submit, value]);

  const [settings, setSettings] = useState<AlertsSelectionSettings>(
    initialValue.alertsSelectionSettings
  );

  const onSettingsChanged = useCallback(
    (newSettings: AlertsSelectionSettings) => {
      setSettings(newSettings);
      setFieldValue('alertsSelectionSettings', newSettings);
    },
    [setFieldValue]
  );

  const [connectorId, setConnectorId] = React.useState<string | undefined>(
    initialValue?.connectorId
  );

  const onConnectorIdSelected = useCallback(
    (selectedConnectorId: string) => {
      setConnectorId(selectedConnectorId);
      setFieldValue('connectorId', selectedConnectorId);
    },
    [setFieldValue]
  );

  const { settingsView } = useSettingsView({
    connectorId,
    onConnectorIdSelected,
    onSettingsChanged,
    settings,
    showConnectorSelector: false,
    stats: null,
  });

  const messageVariables = useMemo(() => {
    return getMessageVariables();
  }, []);

  return (
    <Form form={form} data-test-subj="attackDiscoveryScheduleForm">
      <EuiFlexGroup direction="column" responsive={false}>
        <EuiFlexItem>
          <CommonUseField
            path="name"
            componentProps={{
              'data-test-subj': 'attackDiscoveryFormNameField',
              euiFieldProps: {
                'data-test-subj': 'attackDiscoveryFormNameInput',
                autoFocus: true,
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="connectorId"
            component={ConnectorSelectorField}
            componentProps={{
              connectorId,
              onConnectorIdSelected,
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField path="alertsSelectionSettings">{() => <>{settingsView}</>}</UseField>
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField path="interval" component={ScheduleField} />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="actions"
            component={RuleActionsField}
            componentProps={{
              ruleTypeId: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
              messageVariables,
              defaultRuleFrequency: {
                notifyWhen: RuleNotifyWhen.ACTIVE,
                throttle: null,
                summary: false,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
});
EditForm.displayName = 'EditForm';
