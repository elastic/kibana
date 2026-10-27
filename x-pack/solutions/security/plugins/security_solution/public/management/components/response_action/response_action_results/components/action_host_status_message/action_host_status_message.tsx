/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import type { EuiTextColorProps } from '@elastic/eui';
import { EuiTextColor } from '@elastic/eui';
import { isRunScriptAction } from '../../../../../../../common/endpoint/service/response_actions/type_guards';
import { getAgentActionState } from '../../utils';
import { OUTPUT_MESSAGES } from '../../../../endpoint_response_actions_list/translations';
import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../../../../common/endpoint/service/response_actions/constants';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { ResponseActionResultsProps } from '../../types';

export type ActionHostStatusMessageProps = Omit<ResponseActionResultsProps, 'textSize'>;

export const ActionHostStatusMessage = memo<ActionHostStatusMessageProps>(
  ({ action, agentId = action.agents[0], 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return useMemo(() => {
      const consoleCommandName = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[action.command];
      const agentActionState = getAgentActionState(action, agentId);
      let hostStatusMessage: string = !agentActionState.isCompleted
        ? OUTPUT_MESSAGES.isPending(consoleCommandName)
        : agentActionState.wasCanceled
        ? OUTPUT_MESSAGES.wasCanceled(consoleCommandName)
        : agentActionState.wasSuccessful
        ? OUTPUT_MESSAGES.wasSuccessful(consoleCommandName)
        : action.isExpired
        ? OUTPUT_MESSAGES.hasExpired(consoleCommandName)
        : OUTPUT_MESSAGES.hasFailed(consoleCommandName);
      const hostStatusMessageColor: EuiTextColorProps['color'] = !agentActionState.isCompleted
        ? 'warning'
        : agentActionState.wasCanceled
        ? 'default'
        : agentActionState.wasSuccessful
        ? 'success'
        : 'danger';

      // CrowdStrike specific status override: Isolate/Release actions shows "submitted" only to the user
      if (
        agentActionState.isCompleted &&
        agentActionState.wasSuccessful &&
        action.agentType === 'crowdstrike' &&
        !isRunScriptAction(action)
      ) {
        hostStatusMessage = OUTPUT_MESSAGES.submittedSuccessfully(consoleCommandName);
      }

      return (
        <EuiTextColor data-test-subj={getTestId()} color={hostStatusMessageColor}>
          {hostStatusMessage}
        </EuiTextColor>
      );
    }, [action, agentId, getTestId]);
  }
);
ActionHostStatusMessage.displayName = 'ActionHostStatusMessage';
