/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILTIN_WORKFLOWS } from './index';

// The same pattern enforced by @kbn/human-readable-id / isValidWorkflowId.
// Dots and underscores are intentionally excluded — the workflow management
// plugin rejects them at registration time with a WorkflowValidationError,
// which is caught and swallowed as a log.warn, meaning invalid IDs fail
// silently on every cluster restart.
const WORKFLOW_ID_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

describe('BUILTIN_WORKFLOWS', () => {
  it.each(BUILTIN_WORKFLOWS)('id "$id" passes the workflow-id format validator', ({ id }) => {
    expect(id).toMatch(WORKFLOW_ID_PATTERN);
  });
});
