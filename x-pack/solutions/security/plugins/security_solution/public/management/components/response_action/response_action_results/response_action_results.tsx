/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiTextColorProps } from '@elastic/eui';
import { EuiText, EuiHorizontalRule, EuiSpacer, EuiTextColor } from '@elastic/eui';
import { MemoryDumpResponseActionOutputResult } from '../../memory_dump_response_action_output_result';
import { CancelActionResults } from '../../cancel_action_results';
import { RunscriptOutput } from './components/runscript_results';
import { ScanResults } from './components/scan_results';
import { EndpointUploadActionResult } from '../../endpoint_upload_action_result';
import { GetFileResults } from './components/get_file_results';
import { IsolationResults } from './components/isolation_results';
import type { ResponseActionResultsProps } from './types';
import { KillSuspendProcessActionResult } from '../../kill_process_action_result';
import { OUTPUT_MESSAGES } from '../../endpoint_response_actions_list/translations';
import { KeyValueDisplay } from '../../key_value_display';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { RunningProcessesActionResults } from './components/processes_results';
import { ExecuteResults } from './components/execute_results';
import {
  isCancelAction,
  isExecuteAction,
  isGetFileAction,
  isKillProcessAction,
  isMemoryDumpAction,
  isProcessesAction,
  isRunScriptAction,
  isScanAction,
  isSuspendProcessAction,
  isUploadAction,
} from '../../../../../common/endpoint/service/response_actions/type_guards';

/**
 * Display the results of a response action
 */
export const ResponseActionResults = memo<ResponseActionResultsProps>(
  ({ action, agentId, textSize = 's', 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const agents = useMemo(() => {
      return agentId ? [agentId] : action.agents;
    }, [action.agents, agentId]);

    const isMultiAgent = agents.length > 1;
    const command = action.command;

    if (agentId && !action.agents.includes(agentId)) {
      window.console.warn(
        `EndpointUploadActionResult: Agent id [${agentId}] not in list of agents for action [${command} - ${action.id}]`
      );
      return <></>;
    }

    return (
      <EuiText data-test-subj={getTestId()} size={textSize}>
        {/* eslint-disable-next-line complexity */}
        {agents.map((hostAgentId, index) => {
          const agentActionState = action.agentState[hostAgentId];
          const hostName = action.hosts[hostAgentId]?.name ?? hostAgentId;
          const hostStatusMessage = !agentActionState.isCompleted
            ? OUTPUT_MESSAGES.isPending(command)
            : agentActionState.wasCanceled
            ? OUTPUT_MESSAGES.wasCanceled(command)
            : agentActionState.wasSuccessful
            ? OUTPUT_MESSAGES.wasSuccessful(command)
            : action.isExpired
            ? OUTPUT_MESSAGES.hasExpired(command)
            : OUTPUT_MESSAGES.hasFailed(command);
          const hostStatusMessageColor: EuiTextColorProps['color'] = !agentActionState.isCompleted
            ? 'warning'
            : agentActionState.wasCanceled
            ? 'default'
            : agentActionState.wasSuccessful
            ? 'success'
            : 'danger';
          const hostStatusDisplay = (
            <EuiTextColor color={hostStatusMessageColor}>{hostStatusMessage}</EuiTextColor>
          );

          return (
            <div data-test-subj={getTestId('hostStatusAndResults')} key={hostAgentId}>
              {isMultiAgent ? (
                <>
                  <KeyValueDisplay name={hostName} value={hostStatusDisplay} />
                  {agentActionState.isCompleted && (
                    <div>
                      {OUTPUT_MESSAGES.expandSection.completedAt} {agentActionState.completedAt}
                    </div>
                  )}
                </>
              ) : (
                hostStatusDisplay
              )}

              {agentActionState.isCompleted && (
                <>
                  <EuiSpacer />

                  {(command === 'isolate' || command === 'unisolate') && (
                    <IsolationResults
                      action={action}
                      agentId={hostAgentId}
                      data-test-subj={getTestId('results')}
                    />
                  )}

                  {(isKillProcessAction(action) || isSuspendProcessAction(action)) && (
                    <KillSuspendProcessActionResult
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('results')}
                    />
                  )}

                  {isProcessesAction(action) && (
                    <RunningProcessesActionResults
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('results')}
                    />
                  )}

                  {isGetFileAction(action) && (
                    <GetFileResults
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('results')}
                    />
                  )}

                  {isExecuteAction(action) && (
                    <ExecuteResults
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('results')}
                    />
                  )}

                  {isUploadAction(action) && (
                    <EndpointUploadActionResult
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('results')}
                    />
                  )}

                  {isScanAction(action) && (
                    <ScanResults
                      action={action}
                      agentId={hostAgentId}
                      data-test-subj={getTestId('results')}
                    />
                  )}

                  {isRunScriptAction(action) && (
                    <RunscriptOutput
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('results')}
                    />
                  )}

                  {isCancelAction(action) && (
                    <CancelActionResults
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('results')}
                    />
                  )}

                  {isMemoryDumpAction(action) && (
                    <MemoryDumpResponseActionOutputResult
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('results')}
                    />
                  )}
                </>
              )}

              {isMultiAgent && index !== agents.length - 1 && <EuiHorizontalRule margin="xl" />}
            </div>
          );
        })}
      </EuiText>
    );
  }
);
ResponseActionResults.displayName = 'ResponseActionResults';
