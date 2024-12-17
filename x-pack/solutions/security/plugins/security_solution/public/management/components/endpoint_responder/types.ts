/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BasicConsoleProps } from '../../hooks/use_with_show_responder';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import type { CommandResponseActionApiState } from './hooks/use_console_action_submitter';
import type { ManagedConsoleExtensionComponentProps } from '../console';
import type {
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
} from '../../../../common/endpoint/types';
import type { CommandExecutionComponentProps } from '../console/types';

export interface EndpointCommandDefinitionMeta {
  endpointId: string;
  agentType: ResponseActionAgentType;
}

export type EndpointResponderExtensionComponentProps =
  ManagedConsoleExtensionComponentProps<BasicConsoleProps>;

export type ActionRequestComponentProps<
  TArgs extends object = object,
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
> = CommandExecutionComponentProps<
  { comment?: string } & TArgs,
  CommandResponseActionApiState<TOutputContent, TParameters>,
  EndpointCommandDefinitionMeta
>;
