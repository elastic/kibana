/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

export const telemetryTargetNameSchema = lazySchema(() =>
  z
    .string()
    .regex(/^[a-z][a-z0-9_-]*$/)
    .max(64)
);

const INVESTIGATION_AGENT_ID = 'nightshift.investigation';
const TARGET_AGENT_PREFIX = `${INVESTIGATION_AGENT_ID}.`;

export const getInvestigationAgentId = (target?: string): string =>
  target
    ? `${TARGET_AGENT_PREFIX}${telemetryTargetNameSchema.parse(target)}`
    : INVESTIGATION_AGENT_ID;

export const getInvestigationTelemetryTarget = (agentId?: string): string | undefined =>
  agentId?.startsWith(TARGET_AGENT_PREFIX)
    ? telemetryTargetNameSchema.parse(agentId.slice(TARGET_AGENT_PREFIX.length))
    : undefined;

export const isInvestigationAgentId = (agentId?: string): agentId is string =>
  agentId === INVESTIGATION_AGENT_ID ||
  Boolean(
    agentId?.startsWith(TARGET_AGENT_PREFIX) &&
      telemetryTargetNameSchema.safeParse(agentId.slice(TARGET_AGENT_PREFIX.length)).success
  );
