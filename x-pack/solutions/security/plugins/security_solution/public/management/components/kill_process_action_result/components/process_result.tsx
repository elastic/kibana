/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiTextTruncate } from '@elastic/eui';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { KillProcessActionOutputContent } from '../../../../../common/endpoint/types';

const KILLED_LABEL = i18n.translate(
  'xpack.securitySolution.management.killProcessActionResult.killedLabel',
  {
    defaultMessage: 'Killed',
  }
);
const SUSPENDED_LABEL = i18n.translate(
  'xpack.securitySolution.management.killProcessActionResult.suspendedLabel',
  {
    defaultMessage: 'Suspended',
  }
);
const NOT_KILLED_LABEL = i18n.translate(
  'xpack.securitySolution.management.killProcessActionResult.notKilledLabel',
  {
    defaultMessage: 'Not killed',
  }
);
const NOT_SUSPENDED_LABEL = i18n.translate(
  'xpack.securitySolution.management.killProcessActionResult.notSuspendedLabel',
  {
    defaultMessage: 'Not suspended',
  }
);

export interface ProcessResultProps {
  command: 'kill-process' | 'suspend-process';
  processResult: Required<KillProcessActionOutputContent>['descendants'][number] &
    Pick<KillProcessActionOutputContent, 'process_name'>;
  'data-test-subj'?: string;
}

export const ProcessResult = memo<ProcessResultProps>(
  ({ command, processResult, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const processData: React.ReactNode = useMemo(() => {
      const processResultData: React.ReactNode[] = [];
      const successMsg = command === 'kill-process' ? KILLED_LABEL : SUSPENDED_LABEL;
      const failedMsg = command === 'kill-process' ? NOT_KILLED_LABEL : NOT_SUSPENDED_LABEL;

      if (processResult?.pid) {
        processResultData.push(
          <span key="pid">
            <FormattedMessage
              id="xpack.securitySolution.management.killProcessActionResult.pid"
              defaultMessage="PID {pid}"
              values={{ pid: <EuiCode>{processResult?.pid}</EuiCode> }}
            />
          </span>
        );
      }

      if (processResult?.entity_id) {
        if (processResultData.length > 0) {
          processResultData.push(<DataSeparator key="entityId-sep" />);
        }

        processResultData.push(
          <span key="entityId">
            <FormattedMessage
              id="xpack.securitySolution.management.killProcessActionResult.entityId"
              defaultMessage="Entity ID {entityId}"
              values={{ entityId: <EuiCode>{processResult?.entity_id}</EuiCode> }}
            />
          </span>
        );
      }

      if (processResult?.process_name) {
        if (processResultData.length > 0) {
          processResultData.push(<DataSeparator key="processName-sep" />);
        }

        processResultData.push(
          <span key="processName">
            <FormattedMessage
              id="xpack.securitySolution.management.killProcessActionResult.processName"
              defaultMessage="Name {processName}"
              values={{ processName: <EuiCode>{processResult?.process_name}</EuiCode> }}
            />
          </span>
        );
      }

      if (processResult?.command) {
        if (processResultData.length > 0) {
          processResultData.push(<DataSeparator key="command-sep" />);
        }

        processResultData.push(
          <span key="command" className="eui-displayInlineBlock">
            <EuiFlexGroup responsive={false} gutterSize="none">
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  id="xpack.securitySolution.management.killProcessActionResult.command"
                  defaultMessage="Command"
                />{' '}
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCode className="eui-displayBlock">
                  <EuiTextTruncate
                    truncation="middle"
                    width={350}
                    text={processResult?.command ?? ''}
                  />
                </EuiCode>
              </EuiFlexItem>
            </EuiFlexGroup>
          </span>
        );
      }

      if (processResultData.length > 0) {
        processResultData.push(<DataSeparator key="failureMsg-sep" />);
      }

      if (processResult.was_killed === false || processResult.error) {
        processResultData.push(
          <EuiTextColor color="danger" key="failureMsg">
            {failedMsg}
            {processResult.error && ` - ${processResult.error}`}
          </EuiTextColor>
        );
      } else {
        processResultData.push(
          <EuiTextColor key="successMsg" color="success">
            {successMsg}
          </EuiTextColor>
        );
      }

      return processResultData;
    }, [
      command,
      processResult?.command,
      processResult?.entity_id,
      processResult.error,
      processResult?.pid,
      processResult?.process_name,
      processResult.was_killed,
    ]);

    return <div data-test-subj={getTestId()}>{processData}</div>;
  }
);
ProcessResult.displayName = 'ProcessResult';

const DataSeparator = memo(() => {
  return <EuiTextColor color="subdued">{' | '}</EuiTextColor>;
});
DataSeparator.displayName = 'DataSeparator';
