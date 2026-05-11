/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
} from '../../endpoint/service/response_actions/constants';

/**
 * Zod schema for validating the input to run an emulation command.
 * Ensures agentType is one of the supported EDR agent types and
 * command is one of the supported response action commands.
 */
export const RunEmulationCommandInputSchema = z.object({
  /**
   * Unique identifier for the emulation
   */
  emulationId: z.string(),

  /**
   * The EDR agent type - must be one of the supported agent types
   */
  agentType: z.enum(RESPONSE_ACTION_AGENT_TYPE),

  /**
   * Array of endpoint agent IDs to target with the emulation command
   */
  endpointIds: z.array(z.string()).min(1),

  /**
   * The response action command to execute - must be one of the supported commands
   */
  command: z.enum(RESPONSE_ACTION_API_COMMANDS_NAMES),

  /**
   * Optional parameters specific to the command being executed
   */
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export type RunEmulationCommandInput = z.infer<typeof RunEmulationCommandInputSchema>;
