/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { PropsWithChildren } from 'react';
import React, { memo, useMemo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { EndpointActionFailureMessage } from '../endpoint_action_failure_message';
import type {
  ActionDetails,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
  ActionDetailsAgentState,
  ActionResponseOutput,
  MaybeImmutable,
} from '../../../../common/endpoint/types';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { KeyValueDisplay } from '../key_value_display';

const LABELS = Object.freeze<Record<string, string>>({
  path: i18n.translate('xpack.securitySolution.endpointUploadActionResult.savedTo', {
    defaultMessage: 'File saved to',
  }),

  disk_free_space: i18n.translate(
    'xpack.securitySolution.endpointUploadActionResult.freeDiskSpace',
    {
      defaultMessage: 'Free disk space on drive',
    }
  ),

  noAgentResponse: i18n.translate(
    'xpack.securitySolution.endpointUploadActionResult.missingAgentResult',
    {
      defaultMessage: 'Error: Agent result missing',
    }
  ),

  host: i18n.translate('xpack.securitySolution.endpointUploadActionResult.host', {
    defaultMessage: 'Host',
  }),
});

interface EndpointUploadActionResultProps {
  action: MaybeImmutable<
    ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>
  >;
  /** The agent id to display the result for. If undefined, the output for ALL agents will be displayed */
  agentId?: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

export const EndpointUploadActionResult = memo<EndpointUploadActionResultProps>(
  ({ action: _action, agentId, textSize = 's', 'data-test-subj': dataTestSubj }) => {
    const action = _action as ActionDetails<
      ResponseActionUploadOutputContent,
      ResponseActionUploadParameters
    >;
    const getTestId = useTestIdGenerator(dataTestSubj);

    type DisplayHosts = Array<{
      name: string;
      state: ActionDetailsAgentState;
      result: undefined | ActionResponseOutput<ResponseActionUploadOutputContent>;
    }>;
    const outputs = useMemo<DisplayHosts>(() => {
      const hosts: DisplayHosts = [];
      const agents = agentId ? [agentId] : action.agents;

      for (const agent of agents) {
        hosts.push({
          name: action.hosts[agent].name,
          state: action.agentState[agent],
          result: action.outputs?.[agent],
        });
      }

      return hosts;
    }, [action.agentState, action.agents, action.hosts, action.outputs, agentId]);

    const showHostName = outputs.length > 1;

    if (action.command !== 'upload') {
      window.console.warn(`EndpointUploadActionResult: called with a non-upload action`);
      return <></>;
    }

    if (outputs.length === 0) {
      window.console.warn(
        `EndpointUploadActionResult: Agent id [${agentId}] not in list of agents for action`
      );
      return <></>;
    }

    return (
      <EuiText data-test-subj={getTestId()} size={textSize}>
        {outputs.map(({ name, state, result }) => {
          // Use case: action log
          if (!state.isCompleted) {
            return (
              <HostUploadResult
                name={showHostName ? name : undefined}
                data-test-subj={getTestId('pending')}
                key={name}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpointUploadActionResult.pendingMessage"
                  defaultMessage="Action pending."
                />
              </HostUploadResult>
            );
          }

          // if we don't have an agent result (for whatever reason)
          if (!result) {
            return (
              <HostUploadResult
                name={showHostName ? name : undefined}
                data-test-subj={getTestId('noResultError')}
                key={name}
              >
                {LABELS.noAgentResponse}
              </HostUploadResult>
            );
          }

          // Error result
          if (!state.wasSuccessful) {
            return (
              <HostUploadResult
                name={showHostName ? name : undefined}
                data-test-subj={getTestId('actionFailure')}
                key={name}
              >
                <EndpointActionFailureMessage action={action as ActionDetails} />
              </HostUploadResult>
            );
          }

          return (
            <HostUploadResult
              name={showHostName ? name : undefined}
              data-test-subj={getTestId('success')}
              key={name}
            >
              <KeyValueDisplay name={LABELS.path} value={result.content.path} />
              <KeyValueDisplay
                name={LABELS.disk_free_space}
                value={numeral(result.content.disk_free_space).format('0.00b')}
              />
            </HostUploadResult>
          );
        })}
      </EuiText>
    );
  }
);
EndpointUploadActionResult.displayName = 'EndpointUploadActionResult';

type HostUploadResultProps = PropsWithChildren<{
  name?: string;
  'data-test-subj'?: string;
}>;
const HostUploadResult = memo<HostUploadResultProps>(
  ({ name, children, 'data-test-subj': dataTestSubj }) => {
    return (
      <div data-test-subj={dataTestSubj}>
        {name && <KeyValueDisplay name={LABELS.host} value={name} />}

        {children}

        {name && <EuiSpacer />}
      </div>
    );
  }
);
HostUploadResult.displayName = 'HostUploadResult';
