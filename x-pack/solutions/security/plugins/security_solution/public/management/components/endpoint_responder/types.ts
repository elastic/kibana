/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedHostOsType } from '../../../../common/endpoint/constants';
import type { BasicConsoleProps } from '../../hooks/use_with_show_responder';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import type { CommandResponseActionApiState } from './hooks/use_console_action_submitter';
import type { ManagedConsoleExtensionComponentProps } from '../console';
import type {
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  EndpointPrivileges,
  MaybeImmutable,
} from '../../../../common/endpoint/types';
import type { CommandExecutionComponentProps } from '../console/types';

/**
 * Each Console command can store `meta` data for use by the command's logic. This type defines
 * the data that is defined for all commands (see `lib/console_commands_definition.ts`).
 */
export interface EndpointCommandDefinitionMeta {
  endpointId: string;
  agentType: ResponseActionAgentType;
  capabilities: MaybeImmutable<string[]>;
  privileges: EndpointPrivileges;
  platform: SupportedHostOsType;
}

export type EndpointResponderExtensionComponentProps =
  ManagedConsoleExtensionComponentProps<BasicConsoleProps>;

export type ActionRequestComponentProps<
  /** The console arguments defintion for the command */
  TArgs extends object = object,
  /** The response action output as defined in the ActionDetails when action completes */
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  /** The action's parameters as defined in the ActionDetails for the command */
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
> = CommandExecutionComponentProps<
  { comment?: string } & TArgs,
  CommandResponseActionApiState<TOutputContent, TParameters>,
  EndpointCommandDefinitionMeta
>;
