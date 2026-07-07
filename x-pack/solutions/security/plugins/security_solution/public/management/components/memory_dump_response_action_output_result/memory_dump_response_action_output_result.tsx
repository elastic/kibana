/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n-react';
import { KeyValueDisplay } from '../key_value_display';
import { CONSOLE_COMMANDS, RESPONSE_ACTION_STATUS } from '../../common/translations';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionMemoryDumpOutputContent,
  ResponseActionMemoryDumpParameters,
} from '../../../../common/endpoint/types';
import { EndpointActionFailureMessage } from '../endpoint_action_failure_message';

export interface MemoryDumpResponseActionOutputResultProps {
  action: MaybeImmutable<
    ActionDetails<ResponseActionMemoryDumpOutputContent, ResponseActionMemoryDumpParameters>
  >;
  /**
   * The agent ID (from the list of agents the response action was sent to) to show results for.
   * Defaults to the first one on the list
   */
  agentId?: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

export const MemoryDumpResponseActionOutputResult = memo<MemoryDumpResponseActionOutputResultProps>(
  ({ action, agentId: _agentId, 'data-test-subj': dataTestSubj, textSize = 's' }) => {
    const agentId = _agentId || action.agents[0];
    const testId = useTestIdGenerator(dataTestSubj);
    const agentActionState = action.agentState[agentId];
    const agentActionResult = action.outputs?.[agentId];

    return useMemo(() => {
      if (!action.agents.includes(agentId)) {
        window.console.error(
          `MemoryDumpResponseActionOutputResult called with agentId [${agentId}] not in action.agents`
        );
        return <div data-test-subj={testId()} />;
      }

      let result: React.ReactNode;

      if (!agentActionState.isCompleted) {
        result = (
          <span data-test-subj={testId('pending')}>{RESPONSE_ACTION_STATUS.pendingMessage}</span>
        );
      } else if (!agentActionState.wasSuccessful) {
        result = (
          <EndpointActionFailureMessage action={action} data-test-subj={testId('failure')} />
        );
      } else {
        result = (
          <div data-test-subj={testId('success')}>
            {agentActionResult?.content ? (
              <div>
                <div>
                  <FormattedMessage
                    id="xpack.securitySolution.endpointResponseActions.memoryDumpAction.successTitle"
                    defaultMessage="Memory dump file was created on host:"
                  />
                </div>
                <EuiSpacer size="xs" />
                <KeyValueDisplay
                  name={CONSOLE_COMMANDS.memoryDump.resultFileLabel}
                  value={agentActionResult.content.path}
                />
                <EuiSpacer size="xs" />
                <EuiFlexGroup gutterSize="m" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <KeyValueDisplay
                      name={CONSOLE_COMMANDS.memoryDump.resultFileSizeLabel}
                      value={numeral(agentActionResult.content.file_size ?? 0).format('0.00b')}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <KeyValueDisplay
                      name={CONSOLE_COMMANDS.memoryDump.resultRemainingFreeDiskSpaceLabel}
                      value={numeral(agentActionResult.content.disk_free_space ?? 0).format(
                        '0.00b'
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            ) : (
              <span data-test-subj={testId('agentResultMissing')}>
                {CONSOLE_COMMANDS.memoryDump.agentResultMissing}
              </span>
            )}
          </div>
        );
      }

      return (
        <EuiText data-test-subj={testId()} size={textSize}>
          {result}
        </EuiText>
      );
    }, [
      action,
      agentActionResult?.content,
      agentActionState?.isCompleted,
      agentActionState?.wasSuccessful,
      agentId,
      testId,
      textSize,
    ]);
  }
);
MemoryDumpResponseActionOutputResult.displayName = 'MemoryDumpResponseActionOutputResult';
