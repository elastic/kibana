/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonText,
  EuiStat,
} from '@elastic/eui';
import type { EuiModalProps } from '@elastic/eui/src/components/modal/modal';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useFetchAgentByAgentPolicySummary } from '../../../../../hooks/policy/use_fetch_endpoint_policy_agent_summary';
import { useFetchEndpointPolicy } from '../../../../../hooks/policy/use_fetch_endpoint_policy';
import { RESPONSE_CONSOLE_STORAGE_KEY } from '../../../../../common/constants';
import { Console } from '../../../../../components/console';
import { getEndpointConsoleCommands } from '../../../../../components/endpoint_responder';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

export interface BulkResponseConsoleProps {
  /** The Endpoint (or 3rd party EDR) Integration policy ID */
  integrationPolicyId: string;
  'data-test-subj'?: string;

  // TODO: also add support for multiple agent IDs
}

export const BulkResponseConsole = memo<BulkResponseConsoleProps>(
  ({ integrationPolicyId, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const authz = useUserPrivileges().endpointPrivileges;
    const { data: policyDetailsResponse, isLoading } = useFetchEndpointPolicy(integrationPolicyId);
    const { data: policyAgentCounts, isLoading: isAgentCountsLoading } =
      useFetchAgentByAgentPolicySummary(policyDetailsResponse?.item.policy_ids ?? [], {
        enabled: Boolean(policyDetailsResponse?.item),
      });

    const consoleCommands = useMemo(() => {
      return getEndpointConsoleCommands({
        agentType: 'endpoint',
        endpointPrivileges: authz,
        platform: 'windows',
        endpointAgentId: '',
        endpointCapabilities: [],
      });
    }, [authz]);

    const ConsoleTitleComponent: React.ComponentType = useMemo(() => {
      if (!policyDetailsResponse?.item) {
        return () => null;
      }

      const TitleComponent = () => {
        return (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiStat
                description={i18n.translate(
                  'xpack.securitySolution.bulkResponseConsole.policyAgentTotal',
                  { defaultMessage: 'Agent count' }
                )}
                title={policyAgentCounts?.active ?? 0}
                isLoading={isAgentCountsLoading}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiDescriptionList
                listItems={[
                  {
                    title: i18n.translate('xpack.securitySolution.bulkResponseConsole.policyName', {
                      defaultMessage: 'Policy',
                    }),
                    description: policyDetailsResponse?.item.name ?? '',
                  },
                ]}
                textStyle="reverse"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      };
      TitleComponent.displayName = 'TitleComponent';

      return TitleComponent;
    }, [isAgentCountsLoading, policyAgentCounts?.active, policyDetailsResponse?.item]);

    if (isLoading) {
      return <EuiSkeletonText lines={10} isLoading />;
    }

    // FIMXE:PT show message if policy has no agents

    return (
      <Console
        commands={consoleCommands}
        storagePrefix={RESPONSE_CONSOLE_STORAGE_KEY}
        data-test-subj={getTestId()}
        TitleComponent={ConsoleTitleComponent}
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
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="console" size="l" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.securitySolution.endpointPolicyTakeAction.consoleModalTitle"
                  defaultMessage="Bulk Respond"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
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
