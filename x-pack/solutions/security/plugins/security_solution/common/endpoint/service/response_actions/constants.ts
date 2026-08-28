/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These constants now live in @kbn/security-solution-endpoint-common so that
// platform-group modules — Agent Builder and Workflows — can import them; a platform
// module cannot depend on this plugin, which is group: "security", visibility: "private".
//
// This file re-exports them so existing import paths keep working. Exports are named
// rather than `export *`, so the surface this module exposes stays explicit.

export {
  CANCELLABLE_RESPONSE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
  CONSOLE_RESPONSE_ACTION_COMMANDS,
  DEFAULT_EXECUTE_ACTION_TIMEOUT,
  ECS_OS_TYPE_FIELDS,
  ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS,
  ENDPOINT_CAPABILITIES,
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_STATUS,
  RESPONSE_ACTION_TYPE,
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS,
  RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES,
  RESPONSE_ACTIONS_ZIP_PASSCODE,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_ENDPOINT_CAPABILITY,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
  RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP,
  SUPPORTED_AGENT_ID_ALERT_FIELDS,
} from '@kbn/security-solution-endpoint-common';

export type {
  ConsoleResponseActionCommands,
  EnabledAutomatedResponseActionsCommands,
  EndpointCapabilities,
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
  ResponseActionStatus,
  ResponseActionType,
  ResponseConsoleRbacControls,
} from '@kbn/security-solution-endpoint-common';
