/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public re-exports of the zod-inferred shapes for the `security.endpoint`
 * unified attachment. The single source of truth lives in
 * `common/cases/attachments/endpoint.ts` so the server-side registry
 * (`registerUnified({ schema })`) and the client-side renderers can never drift.
 *
 * The cases unified-reference dispatcher types `metadata` as
 * `Record<string, JsonValue>`; renderers cast to `EndpointMetadata` because
 * the registered zod payload schema guarantees this shape on the write path.
 */
export type {
  EndpointAttachmentMetadata as EndpointMetadata,
  EndpointAttachmentTarget as EndpointTarget,
  EndpointAttachmentData as EndpointData,
} from '../../../../common/cases/attachments/endpoint';
