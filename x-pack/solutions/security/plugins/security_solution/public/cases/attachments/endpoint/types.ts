/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';

/**
 * Shape of the metadata stored on a `security.endpoint` unified attachment.
 * Server-side `validateEndpointAttachmentMetadata` guarantees this shape on
 * the write path, so renderers can safely cast the unified view's `metadata`
 * (typed as `Record<string, JsonValue>`) to `EndpointMetadata`.
 */
export interface EndpointTarget {
  endpointId: string;
  hostname: string;
  agentType: ResponseActionAgentType;
}

export interface EndpointMetadata {
  comment: string;
  command: string;
  targets: EndpointTarget[];
}
