/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiTextColor } from '@elastic/eui';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { KillProcessActionOutputContent } from '../../../../../common/endpoint/types';

export interface ProcessResultProps {
  processResult: Required<KillProcessActionOutputContent>['descendants'][number] &
    Pick<KillProcessActionOutputContent, 'process_name'>;
  'data-test-subj'?: string;
}

export const ProcessResult = memo<ProcessResultProps>(
  ({ processResult, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const processData: React.ReactNode = useMemo(() => {
      const processResultData: React.ReactNode[] = [];

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
          <span key="command">
            <FormattedMessage
              id="xpack.securitySolution.management.killProcessActionResult.command"
              defaultMessage="Command {command}"
              values={{ command: <EuiCode>{processResult?.command}</EuiCode> }}
            />
          </span>
        );
      }

      return processResultData;
    }, [
      processResult?.command,
      processResult?.entity_id,
      processResult?.pid,
      processResult?.process_name,
    ]);

    return <div data-test-subj={getTestId()}>{processData}</div>;
  }
);
ProcessResult.displayName = 'ProcessResult';

const DataSeparator = memo(() => {
  return <EuiTextColor color="subdued">{' | '}</EuiTextColor>;
});
DataSeparator.displayName = 'DataSeparator';
