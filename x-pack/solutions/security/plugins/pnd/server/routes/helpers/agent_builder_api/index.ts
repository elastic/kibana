/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Agent Builder API surface PND calls, in one place.
 *
 * PND reaches Agent Builder only over HTTP, as the calling user, through Core's self client (D7) —
 * never through an internal client and never through the `agentBuilder` start contract's services.
 * That is what makes Agent Builder enforce its own authorization on every hop, and it is why these
 * are paths and a version rather than imported service methods.
 *
 * Hardcoded rather than imported from `@kbn/agent-builder-common`: `publicApiPath` is not part of
 * that package's public surface, and these are a stable public contract. Every path below is
 * `access: 'public'` and requires `apiPrivileges.readAgentBuilder` — with the single exception of
 * {@link buildAgentBuilderConversationRenamePath}, which has no public counterpart at all. See the
 * note there.
 */
export const AGENT_BUILDER_API_VERSION = '2023-10-31';

/** `GET` lists the caller's conversations; `GET {path}/{id}` reads one. */
export const AGENT_BUILDER_CONVERSATIONS_PATH = '/api/agent_builder/conversations';

/**
 * The **synchronous** converse route.
 *
 * Deliberately not `/converse/async`, which is SSE (`observableIntoEventSourceStream`) and would
 * hand PND an event stream it has no use for. Sending no `_execution_mode` is also deliberate:
 * `shouldUseScheduledTask` returns true unless the mode is `'local'` or the request is a fake
 * request, so Task Manager — and durability across a client disconnect — is the default.
 */
export const AGENT_BUILDER_CONVERSE_PATH = '/api/agent_builder/converse';

/** `GET`/`DELETE` one conversation by id. */
export const buildAgentBuilderConversationPath = (conversationId: string): string =>
  `${AGENT_BUILDER_CONVERSATIONS_PATH}/${encodeURIComponent(conversationId)}`;

/** `GET` lists a conversation's attachments; `POST` creates one. */
export const buildAgentBuilderAttachmentsPath = (conversationId: string): string =>
  `${buildAgentBuilderConversationPath(conversationId)}/attachments`;

/**
 * Agent Builder's **internal** conversations path, reached for exactly one operation: rename.
 *
 * Renaming is not part of Agent Builder's public API — `routes/conversations.ts` publishes only
 * list, get and delete, and `_rename` lives in `routes/internal/conversations.ts`. So a PND rename
 * route either hops here or does not exist, and D9 chose to ship it.
 */
export const AGENT_BUILDER_INTERNAL_CONVERSATIONS_PATH = '/internal/agent_builder/conversations';

/**
 * `POST` renames one conversation, taking `{ title }` and answering `{ id, title }`.
 *
 * Two things about this route differ from every other path here, and both are deliberate rather
 * than oversights to be "fixed":
 *
 * - **It is internal**, so the hop must carry the internal-origin header (`access: 'internal'` on
 *   the self client) or Core answers `400` before Agent Builder sees it.
 * - **It is unversioned** (`router.post`, not `router.versioned.post`), so it has no version to
 *   negotiate and the hop sends no `elastic-api-version` header.
 *
 * It also takes `access: 'owner'` internally, which public access never grants — the constraint D9
 * records, and the reason PND server code never calls its own rename route.
 */
export const buildAgentBuilderConversationRenamePath = (conversationId: string): string =>
  `${AGENT_BUILDER_INTERNAL_CONVERSATIONS_PATH}/${encodeURIComponent(conversationId)}/_rename`;
