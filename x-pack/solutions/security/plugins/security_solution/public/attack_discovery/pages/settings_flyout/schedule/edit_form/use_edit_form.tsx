/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';

import { getSchema } from './schema';
import * as i18n from './translations';
import type { AttackDiscoveryScheduleSchema } from './types';

import { ConnectorSelectorField } from '../form_fields/connector_selector_field';
import { ScheduleField } from '../form_fields/schedule_field';
import { useSettingsView } from '../../hooks/use_settings_view';
import type { AlertsSelectionSettings } from '../../types';
import { getDefaultQuery } from '../../../helpers';
import { RuleActionsField } from '../../../../../common/components/rule_actions_field';
import { useKibana } from '../../../../../common/lib/kibana';
import type { FormSubmitHandler } from '../../../../../shared_imports';
import { Field, Form, UseField, getUseField, useForm } from '../../../../../shared_imports';

const CommonUseField = getUseField({ component: Field });

const defaultInitialValue: AttackDiscoveryScheduleSchema = {
  name: '',
  alertsSelectionSettings: {
    query: getDefaultQuery(),
    filters: [],
    size: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
    start: DEFAULT_START,
    end: DEFAULT_END,
  },
  interval: '24h',
  actions: [],
};

export interface UseEditForm {
  editForm: React.ReactNode;
  actionButtons: React.ReactNode;
}

export interface UseEditFormProps {
  initialValue?: AttackDiscoveryScheduleSchema;
  onSave?: (scheduleData: AttackDiscoveryScheduleSchema) => void;
  saveButtonDisabled?: boolean;
  saveButtonTitle?: string;
}

export const useEditForm = (props: UseEditFormProps): UseEditForm => {
  const {
    initialValue = defaultInitialValue,
    onSave,
    saveButtonDisabled = false,
    saveButtonTitle,
  } = props;
  const { euiTheme } = useEuiTheme();
  const {
    triggersActionsUi: { actionTypeRegistry },
  } = useKibana().services;

  const handleFormSubmit = useCallback<FormSubmitHandler<AttackDiscoveryScheduleSchema>>(
    async (formData, isValid) => {
      if (!isValid) {
        return;
      }
      onSave?.(formData);
    },
    [onSave]
  );

  const { form } = useForm<AttackDiscoveryScheduleSchema>({
    defaultValue: initialValue,
    options: { stripEmptyFields: false },
    schema: getSchema({ actionTypeRegistry }),
    onSubmit: handleFormSubmit,
  });

  const { setFieldValue, submit } = form;

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

  const { settingsView } = useSettingsView({ settings, onSettingsChanged });

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

  const messageVariables = useMemo(() => {
    return {
      state: [],
      params: [],
      context: [],
    };
  }, []);

  const editForm = useMemo(() => {
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
                messageVariables,
                summaryMessageVariables: messageVariables,
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Form>
    );
  }, [connectorId, form, messageVariables, onConnectorIdSelected, settingsView]);

  const onCreate = useCallback(() => {
    submit();
  }, [submit]);

  const actionButtons = useMemo(() => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem
          css={css`
            margin-right: ${euiTheme.size.s};
          `}
          grow={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="save"
              fill
              size="s"
              onClick={onCreate}
              disabled={saveButtonDisabled}
            >
              {saveButtonTitle ?? i18n.SCHEDULE_SAVE_BUTTON_TITLE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [euiTheme.size.s, onCreate, saveButtonDisabled, saveButtonTitle]);

  return { editForm, actionButtons };
};
