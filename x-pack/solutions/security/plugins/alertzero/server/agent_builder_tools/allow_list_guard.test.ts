/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALERTZERO_ACTIONS_LIST_TOOL_ID,
  ALERTZERO_PROPOSALS_REVISE_TOOL_ID,
} from '@kbn/alertzero-common';

const alertzeroToolIds = [ALERTZERO_ACTIONS_LIST_TOOL_ID, ALERTZERO_PROPOSALS_REVISE_TOOL_ID];

const allowListPath = join(
  __dirname,
  '../../../../../../../platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts'
);
const allowListSource = readFileSync(allowListPath, 'utf8');

describe('alertzero built-in tools allow list', () => {
  it('every alertzero built-in tool id is listed in AGENT_BUILDER_BUILTIN_TOOLS', () => {
    // Registration of a built-in tool missing from this list crashes the
    // agent-builder server at startup (see allow_lists.ts and
    // agent_builder/server/services/tools/tools_service.ts).
    for (const toolId of alertzeroToolIds) {
      expect(allowListSource).toContain(toolId);
    }
  });
});
