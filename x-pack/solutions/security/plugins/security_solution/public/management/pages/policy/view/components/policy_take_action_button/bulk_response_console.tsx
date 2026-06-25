/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import type { EuiModalProps } from '@elastic/eui/src/components/modal/modal';
import { FormattedMessage } from '@kbn/i18n-react';
import { RESPONSE_CONSOLE_STORAGE_KEY } from '../../../../../common/constants';
import { Console } from '../../../../../components/console';
import { getEndpointConsoleCommands } from '../../../../../components/endpoint_responder';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

export interface BulkResponseConsoleProps {
  // TODO:PT define props

  'data-test-subj'?: string;
}

export const BulkResponseConsole = memo<BulkResponseConsoleProps>(
  ({ 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const authz = useUserPrivileges().endpointPrivileges;

    const consoleCommands = useMemo(() => {
      return getEndpointConsoleCommands({
        agentType: 'endpoint',
        endpointPrivileges: authz,
        platform: 'windows',
        endpointAgentId: '',
        endpointCapabilities: [],
      });
    }, [authz]);

    return (
      <Console
        commands={consoleCommands}
        storagePrefix={RESPONSE_CONSOLE_STORAGE_KEY}
        data-test-subj={getTestId()}
        TitleComponent={() => <>{'Policy: blah (300 agents)'}</>}
      />
    );
  }
);
BulkResponseConsole.displayName = 'BulkResponseConsole';

interface BulkResponseConsoleModalProps extends BulkResponseConsoleProps {
  onClose: EuiModalProps['onClose'];
}

export const BulkResponseConsoleModal = memo<BulkResponseConsoleModalProps>(
  ({ onClose, ...props }) => {
    const getTestId = useTestIdGenerator(props['data-test-subj']);

    return (
      <EuiModal
        maxWidth={false}
        style={{ height: '70vw', width: '70vw' }}
        onClose={onClose}
        aria-label="user take action modal"
        data-test-subj={getTestId('modal')}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.securitySolution.endpointPolicyTakeAction.consoleModalTitle"
              defaultMessage="Bulk Respond"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <BulkResponseConsole {...props} />
        </EuiModalBody>
      </EuiModal>
    );
  }
);
BulkResponseConsoleModal.displayName = 'BulkResponseConsoleModal';
