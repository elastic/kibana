/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import type { ConsoleApi, ConsoleProps } from '../components/console/types';
import { type SupportedHostOsType } from '../../../common/endpoint/constants';
import { useLicense } from '../../common/hooks/use_license';
import type { MaybeImmutable } from '../../../common/endpoint/types';
import {
  type ResponseActionAgentType,
  type EndpointCapabilities,
} from '../../../common/endpoint/service/response_actions/constants';
import { AgentInfo } from '../components/endpoint_responder/components/header_info/agent_info/agent_info';

import { useUserPrivileges } from '../../common/components/user_privileges';
import {
  ActionLogButton,
  getEndpointConsoleCommands,
  OfflineCallout,
} from '../components/endpoint_responder';
import { useConsoleManager } from '../components/console';
import { MissingEncryptionKeyCallout } from '../components/missing_encryption_key_callout';
import { RESPONDER_PAGE_TITLE } from './translations';

type ShowResponseActionsConsole = (props: ResponderInfoProps) => void;

export interface BasicConsoleProps {
  agentId: string;
  hostName: string;
  /** Required for Endpoint agents. */
  capabilities: MaybeImmutable<EndpointCapabilities[]>;
  platform: string;
  /**
   * If defined, the console's input area will be populated with this command
   */
  inputCommand?: string;
}

type ResponderInfoProps =
  | (BasicConsoleProps & {
      agentType: Extract<ResponseActionAgentType, 'endpoint'>;
    })
  | (BasicConsoleProps & {
      agentType: Exclude<ResponseActionAgentType, 'endpoint'>;
    });

export const useWithShowResponder = (): ShowResponseActionsConsole => {
  const consoleManager = useConsoleManager();
  const endpointPrivileges = useUserPrivileges().endpointPrivileges;
  const isEnterpriseLicense = useLicense().isEnterprise();
  const consoleApi = useRef<ConsoleApi>();
  const pendingInputCommand = useRef<string | undefined>();

  const applyPendingInputCommand = useCallback((api: ConsoleApi) => {
    if (pendingInputCommand.current) {
      api.setInput(pendingInputCommand.current);
      pendingInputCommand.current = undefined;
    }
  }, []);

  return useCallback(
    (props: ResponderInfoProps) => {
      const { agentId, agentType, capabilities, hostName, platform, inputCommand } = props;

      // If no authz, just exit and log something to the console
      if (agentType === 'endpoint' && !endpointPrivileges.canAccessResponseConsole) {
        window.console.error(new Error(`Access denied to ${agentType} response actions console`));
        return;
      }

      if (agentType !== 'endpoint' && !isEnterpriseLicense) {
        window.console.error(new Error(`Access denied to ${agentType} response actions console`));
        return;
      }

      const endpointRunningConsole = consoleManager.getOne(agentId);

      pendingInputCommand.current = inputCommand;

      if (endpointRunningConsole) {
        // An already visible console is not re-mounted by `show()`, so `onApiAvailable` won't fire
        const isAlreadyVisible = endpointRunningConsole.isVisible();

        endpointRunningConsole.show();

        if (isAlreadyVisible && consoleApi.current) {
          applyPendingInputCommand(consoleApi.current);
        }
      } else {
        const consoleProps: ConsoleProps = {
          commands: getEndpointConsoleCommands({
            agentType,
            endpointAgentId: agentId,
            endpointCapabilities: capabilities,
            endpointPrivileges,
            platform: platform as SupportedHostOsType,
          }),
          'data-test-subj': `${agentType}ResponseActionsConsole`,
          storagePrefix: 'xpack.securitySolution.Responder',
          apiRef: consoleApi,
          onApiAvailable: applyPendingInputCommand,
          TitleComponent: () => {
            return (
              <AgentInfo
                agentId={agentId}
                agentType={agentType}
                hostName={hostName}
                platform={platform}
              />
            );
          },
        };

        consoleManager
          .register({
            id: agentId,
            meta: {
              agentId,
              hostName,
              capabilities,
              platform,
            },
            consoleProps,
            PageTitleComponent: () => {
              return <>{RESPONDER_PAGE_TITLE}</>;
            },
            ActionComponents: endpointPrivileges.canReadActionsLogManagement
              ? [ActionLogButton]
              : undefined,
            PageBodyComponent: () => (
              <>
                <OfflineCallout
                  endpointId={props.agentId}
                  agentType={agentType}
                  hostName={hostName}
                />
                <MissingEncryptionKeyCallout />
              </>
            ),
          })
          .show();
      }
    },
    [endpointPrivileges, isEnterpriseLicense, consoleManager, applyPendingInputCommand]
  );
};
