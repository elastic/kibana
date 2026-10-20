/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { ALERTZERO_ACTIONS_LIST_TOOL_ID } from '@kbn/alertzero-common';
import type { AssertAlertZeroAccess } from '../../agent_builder_tools/assert_alertzero_access';

export const createActionDiscoverySkill = (assertAccess: AssertAlertZeroAccess): SkillDefinition =>
  defineSkillType({
    id: 'alertzero-action-discovery',
    name: 'alertzero-action-discovery',
    basePath: 'skills/security/alerts',
    description:
      'Discover installed AlertZero action workflows and their input schemas when choosing an action to propose or explaining available response and configuration actions.',
    availability: {
      cacheMode: 'none',
      handler: async ({ request }) => {
        try {
          await assertAccess(request, 'read');
          return { status: 'available' };
        } catch {
          return {
            status: 'unavailable',
            reason: 'Requires AlertZero to be enabled in this space and permission to read it.',
          };
        }
      },
    },
    getRegistryTools: () => [ALERTZERO_ACTIONS_LIST_TOOL_ID],
    content: `# AlertZero action discovery

Use security.alertzero.actions.list to discover the installed action workflows.
Filter by categories when the request identifies a category; otherwise list all actions.
Use the returned workflowId, description, approvalPolicy, impact, and inputSchema
to explain suitable actions and determine the inputs a proposal would need.
Use the catalog's actual workflow IDs and input fields. If no suitable action is
available, explain the gap to the analyst.

Discovery does not approve or execute an action. For changes to an existing
proposal, load the proposal-management skill and read its current revision.
`,
  });
