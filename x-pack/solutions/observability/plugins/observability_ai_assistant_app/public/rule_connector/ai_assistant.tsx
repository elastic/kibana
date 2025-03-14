/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { isEmpty } from 'lodash';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { ObservabilityAIAssistantService } from '@kbn/observability-ai-assistant-plugin/public';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID } from '../../common/rule_connector';
import { ObsAIAssistantActionParams } from './types';
import {
  CONNECTOR_DESC,
  CONNECTOR_REQUIRED,
  CONNECTOR_TITLE,
  MESSAGE_REQUIRED,
  STATUS_REQUIRED,
} from './translations';

export function getConnectorType(
  service: ObservabilityAIAssistantService
): ConnectorTypeModel<unknown, {}, ObsAIAssistantActionParams> {
  return {
    id: OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID,
    modalWidth: 675,
    iconClass: () => <AssistantIcon />,
    isSystemActionType: true,
    isExperimental: true,
    selectMessage: CONNECTOR_DESC,
    actionTypeTitle: CONNECTOR_TITLE,
    validateParams: async (
      actionParams: ObsAIAssistantActionParams
    ): Promise<GenericValidationResult<ObsAIAssistantActionParams>> => {
      const validatePrompt = (prompt: { message: string; statuses: string[] }): string[] => {
        const errors: string[] = [];

        if (!prompt.message) {
          errors.push(MESSAGE_REQUIRED);
        }
        if (isEmpty(prompt.statuses)) {
          errors.push(STATUS_REQUIRED);
        }

        return errors;
      };

      return {
        errors: {
          connector: actionParams.connector ? [] : [CONNECTOR_REQUIRED],
          message: actionParams.message && !actionParams.prompts ? [MESSAGE_REQUIRED] : [],
          prompts: actionParams.prompts?.map(validatePrompt) || [],
        },
      };
    },
    actionParamsFields: lazy(() =>
      import('./ai_assistant_params').then(({ default: ActionParamsFields }) => ({
        default: (props) => <ActionParamsFields {...props} service={service} />,
      }))
    ),
    actionConnectorFields: null,
  };
}
