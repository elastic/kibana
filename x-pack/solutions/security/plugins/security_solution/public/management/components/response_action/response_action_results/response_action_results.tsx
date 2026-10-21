/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { ActionHostStatusMessage } from './components/action_host_status_message';
import { getAgentActionState } from './utils';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { MemoryDumpResponseActionOutputResult } from './components/memory_dump_results/memory_dump_response_action_output_result';
import { CancelActionResults } from './components/cancel_results/cancel_action_results';
import { RunscriptActionResult } from './components/runscript_results';
import { ScanResults } from './components/scan_results';
import { EndpointUploadActionResult } from './components/upload_results/endpoint_upload_action_result';
import { GetFileResults } from './components/get_file_results';
import { IsolationResults } from './components/isolation_results';
import type { ResponseActionResultsProps } from './types';
import { KillSuspendProcessActionResult } from './components/kill_process_results/kill_process_action_result';
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
        `ResponseActionResults: Agent id [${agentId}] not in list of agents for action [${command} - ${action.id}]`
      );
      return <></>;
    }

    return (
      <EuiText data-test-subj={getTestId()} size={textSize}>
        {/* eslint-disable-next-line complexity */}
        {agents.map((hostAgentId, index) => {
          const agentActionState = getAgentActionState(action, hostAgentId);
          const hostName = action.hosts[hostAgentId]?.name ?? hostAgentId;
          const hostStatusDisplay = (
            <ActionHostStatusMessage
              action={action}
              agentId={hostAgentId}
              data-test-subj={getTestId('hostStatus')}
            />
          );

          return (
            <div data-test-subj={getTestId('hostStatusAndResults')} key={hostAgentId}>
              {isMultiAgent ? (
                <>
                  <KeyValueDisplay name={hostName} value={hostStatusDisplay} />
                  {agentActionState.isCompleted && (
                    <div>
                      {OUTPUT_MESSAGES.expandSection.completedAt}{' '}
                      <FormattedDate
                        fieldName={i18n.translate(
                          'xpack.securitySolution.responseAction.responseActionResults.hostCompletedAt',
                          { defaultMessage: 'Completed' }
                        )}
                        value={agentActionState.completedAt}
                      />
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
                      data-test-subj={getTestId('isolatationResults')}
                    />
                  )}

                  {(isKillProcessAction(action) || isSuspendProcessAction(action)) && (
                    <KillSuspendProcessActionResult
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('killSuspendProcessResults')}
                    />
                  )}

                  {isProcessesAction(action) && (
                    <RunningProcessesActionResults
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('processesResults')}
                    />
                  )}

                  {isGetFileAction(action) && (
                    <GetFileResults
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('getFileResults')}
                    />
                  )}

                  {isExecuteAction(action) && (
                    <ExecuteResults
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('executeResults')}
                    />
                  )}

                  {isUploadAction(action) && (
                    <EndpointUploadActionResult
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('uploadResults')}
                    />
                  )}

                  {isScanAction(action) && (
                    <ScanResults
                      action={action}
                      agentId={hostAgentId}
                      data-test-subj={getTestId('scanResults')}
                    />
                  )}

                  {isRunScriptAction(action) && (
                    <RunscriptActionResult
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('runscriptResults')}
                    />
                  )}

                  {isCancelAction(action) && (
                    <CancelActionResults
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('cancelResults')}
                    />
                  )}

                  {isMemoryDumpAction(action) && (
                    <MemoryDumpResponseActionOutputResult
                      action={action}
                      agentId={hostAgentId}
                      textSize={textSize}
                      data-test-subj={getTestId('memoryDumpResults')}
                    />
                  )}
                </>
              )}

              {isMultiAgent && index !== agents.length - 1 && <EuiHorizontalRule margin="l" />}
            </div>
          );
        })}
      </EuiText>
    );
  }
);
ResponseActionResults.displayName = 'ResponseActionResults';
