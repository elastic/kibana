/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFormRow,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiComboBox,
  EuiButton,
  EuiFlexGroup,
} from '@elastic/eui';
import {
  ObservabilityAIAssistantService,
  useGenAIConnectorsWithoutContext,
} from '@kbn/observability-ai-assistant-plugin/public';
import { RuleFormParamsErrors } from '@kbn/alerts-ui-shared';
import { ObsAIAssistantActionParams } from './types';
import { ALERT_STATUSES } from '../../common/constants';
import { MESSAGE_REQUIRED, STATUS_REQUIRED } from './translations';

const ObsAIAssistantParamsFields: React.FunctionComponent<
  ActionParamsProps<ObsAIAssistantActionParams> & { service: ObservabilityAIAssistantService }
> = ({ errors, index, messageVariables, editAction, actionParams, service }) => {
  const { connectors, loading, selectConnector, selectedConnector } =
    useGenAIConnectorsWithoutContext(service);

  useEffect(() => {
    if (selectedConnector !== actionParams.connector) {
      editAction('connector', selectedConnector, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams, selectedConnector, index]);

  useEffect(() => {
    // Ensure backwards compatibility by using the message field as a prompt if prompts are missing
    if (!actionParams.prompts) {
      editAction(
        'prompts',
        [
          {
            statuses: ALERT_STATUSES,
            message: actionParams.message || '',
          },
        ],
        index
      );
    }
    // forward-compatible fallback.
    if (actionParams.prompts && actionParams.prompts[0].message !== actionParams.message) {
      editAction('message', actionParams.prompts[0].message, index);
    }
  }, [actionParams, editAction, index]);

  const handleOnChange = (
    key: 'statuses' | 'message',
    value: string | string[],
    promptIndex: number
  ) => {
    const prompts = actionParams.prompts ? [...actionParams.prompts] : [];
    prompts[promptIndex] = { ...prompts[promptIndex], [key]: value };
    editAction('prompts', prompts, index);
  };

  const handleAddPrompt = () => {
    if (actionParams.prompts) {
      const prompts = [
        ...actionParams.prompts,
        {
          statuses: ALERT_STATUSES,
          message: '',
        },
      ];
      editAction('prompts', prompts, index);
    }
  };
  const handleRemovePrompt = () => {
    if (actionParams.prompts) {
      const prompts = actionParams.prompts.slice(0, -1);
      editAction('prompts', prompts, index);
    }
  };

  const isValidField = (statusError: string, promptIndex: number) => {
    const errorsList = ((errors.prompts as RuleFormParamsErrors)?.[promptIndex] as string[]) || [];
    return errorsList.includes(statusError);
  };

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.observabilityAiAssistant.alertConnector.selectLlmConnector', {
          defaultMessage: 'Connector',
        })}
      >
        <EuiSelect
          fullWidth
          data-test-subj="observabilityAiAssistantAlertConnectorSelect"
          isLoading={loading}
          // @ts-expect-error upgrade typescript v5.1.6
          isInvalid={errors.connector?.length > 0}
          options={connectors?.map((connector) => {
            return { value: connector.id, text: connector.name };
          })}
          onChange={(event) => {
            selectConnector(event.target.value);
            editAction('connector', event.target.value, index);
          }}
          value={actionParams.connector}
        />
      </EuiFormRow>

      {actionParams?.prompts?.map((prompt, promptIndex) => (
        <div key={promptIndex}>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.observabilityAiAssistant.alertConnector.messageTextAreaFieldLabel',
              {
                defaultMessage: 'On status changes',
              }
            )}
          >
            <EuiComboBox
              fullWidth
              id={`addNewActionConnectorActionGroup-${index}`}
              data-test-subj={`addNewActionConnectorActionGroup-${index}`}
              options={ALERT_STATUSES.map((id) => ({
                label: id,
              }))}
              selectedOptions={prompt.statuses.map((id) => ({ label: id }))}
              onChange={(statuses) => {
                handleOnChange(
                  'statuses',
                  statuses.map((status) => status.label),
                  promptIndex
                );
              }}
              isClearable={true}
              isInvalid={isValidField(STATUS_REQUIRED, promptIndex)}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.observabilityAiAssistant.alertConnector.messageTextAreaFieldLabel',
              {
                defaultMessage: 'Message',
              }
            )}
          >
            <EuiFlexItem grow={false}>
              <EuiTextArea
                fullWidth
                data-test-subj="observabilityAiAssistantAlertConnectorMessageTextArea"
                value={prompt.message}
                onChange={(event) => {
                  handleOnChange('message', event.target.value, promptIndex);
                }}
                isInvalid={isValidField(MESSAGE_REQUIRED, promptIndex)}
              />
            </EuiFlexItem>
          </EuiFormRow>
        </div>
      ))}
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <EuiButton
            disabled={actionParams?.prompts?.length === 1}
            size="m"
            fullWidth
            color="danger"
            iconType="minusInCircle"
            data-test-subj="removePropmptButton"
            onClick={handleRemovePrompt}
          >
            <FormattedMessage
              id="xpack.observabilityAiAssistant.alertConnector.removePromptButtonLabel"
              defaultMessage="Remove Prompt"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiButton
            disabled={actionParams?.prompts?.length === ALERT_STATUSES.length}
            size="m"
            fullWidth
            iconType="plusInCircle"
            data-test-subj="addPrompButton"
            onClick={handleAddPrompt}
          >
            <FormattedMessage
              id="xpack.observabilityAiAssistant.alertConnector.addPromptButtonLabel"
              defaultMessage="Add Prompt"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ObsAIAssistantParamsFields as default };
