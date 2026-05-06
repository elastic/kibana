/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { isLeft } from 'fp-ts/Either';
import Boom from '@hapi/boom';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../common/endpoint/service/response_actions/constants';

/**
 * Closed union over the domain `ResponseActionAgentType` so typos and
 * unexpected values are rejected at attachment registration time rather
 * than silently persisted.
 */
const AgentTypeRt = rt.union(
  RESPONSE_ACTION_AGENT_TYPE.map((agentType) => rt.literal(agentType)) as [
    rt.LiteralC<(typeof RESPONSE_ACTION_AGENT_TYPE)[number]>,
    rt.LiteralC<(typeof RESPONSE_ACTION_AGENT_TYPE)[number]>,
    ...Array<rt.LiteralC<(typeof RESPONSE_ACTION_AGENT_TYPE)[number]>>
  ]
);

const EndpointTargetRt = rt.strict({
  endpointId: rt.string,
  hostname: rt.string,
  agentType: AgentTypeRt,
});

/**
 * `rt.strict` strips unknown top-level keys in the decoded value. To reject
 * unknown keys outright (a reasonable v2 expectation), we additionally
 * enforce an allow-list explicitly. `targets` is required to be non-empty
 * since a response-action attachment with zero targets is semantically invalid.
 */
const EndpointAttachmentMetadataRt = rt.strict({
  command: rt.string,
  comment: rt.string,
  targets: rt.array(EndpointTargetRt),
});

const ALLOWED_TOP_LEVEL_KEYS = new Set(['command', 'comment', 'targets']);

/**
 * Throws `Boom.badRequest` (HTTP 400) on invalid metadata so the cases-plugin
 * route handler surfaces a client error instead of a 500. Plain `Error`s thrown
 * from registered `schemaValidator` callbacks bubble up as 500 Internal Server
 * Error and pollute the server logs with stack traces for what is really a
 * caller mistake.
 */
export const validateEndpointAttachmentMetadata = (data: unknown): void => {
  if (data === null || typeof data !== 'object') {
    throw Boom.badRequest(
      `Invalid endpoint attachment metadata: expected an object, received ${
        data === null ? 'null' : typeof data
      }`
    );
  }

  const result = EndpointAttachmentMetadataRt.decode(data);
  if (isLeft(result)) {
    throw Boom.badRequest(
      `Invalid endpoint attachment metadata: expected { command: string, comment: string, targets: Array<{ endpointId: string, hostname: string, agentType: ResponseActionAgentType }> }`
    );
  }

  const extraKeys = Object.keys(data as object).filter((key) => !ALLOWED_TOP_LEVEL_KEYS.has(key));
  if (extraKeys.length > 0) {
    throw Boom.badRequest(
      `Invalid endpoint attachment metadata: unknown key(s) [${extraKeys.join(', ')}]`
    );
  }

  if (result.right.targets.length === 0) {
    throw Boom.badRequest(
      'Invalid endpoint attachment metadata: targets must contain at least one entry'
    );
  }
};
