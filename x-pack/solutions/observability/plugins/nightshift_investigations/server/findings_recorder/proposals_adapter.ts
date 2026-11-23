/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { PROPOSAL_CATEGORY_TODO, type ActionCatalogEntry } from '@kbn/proposals-common';
import type { RecorderProposals } from './run_pass';

/** The titles read per conversation. A conversation has a handful of proposals, not hundreds. */
const MAX_LISTED_PROPOSALS = 50;
/** The action workflows shown to the recorder. Each one costs prompt tokens on every final pass. */
export const MAX_RECORDER_ACTIONS = 20;
/**
 * Per workflow, so one long description or schema (the `action` tag is easy to copy along with a
 * workflow) cannot crowd out the rest of the final-pass prompt.
 */
export const MAX_RECORDER_ACTION_DESCRIPTION_LENGTH = 500;
export const MAX_RECORDER_ACTION_SCHEMA_LENGTH = 2000;

const fitsPrompt = ({ inputSchema }: ActionCatalogEntry): boolean =>
  JSON.stringify(inputSchema ?? {}).length <= MAX_RECORDER_ACTION_SCHEMA_LENGTH;

const shortenDescription = (action: ActionCatalogEntry): ActionCatalogEntry => {
  const { description } = action;
  if (!description || description.length <= MAX_RECORDER_ACTION_DESCRIPTION_LENGTH) {
    return action;
  }
  return {
    ...action,
    description: `${description.slice(0, MAX_RECORDER_ACTION_DESCRIPTION_LENGTH)}…`,
  };
};

/**
 * What the findings recorder needs from the proposals plugin: the titles already proposed in a
 * conversation, the action workflows a proposal can run, and a way to propose.
 */
export const createRecorderProposals = ({
  proposals,
  getSpaceId,
}: {
  proposals: ProposalsPluginStart;
  getSpaceId: (request: KibanaRequest) => string;
}): RecorderProposals => {
  // These carry no action workflow: the analyst carries each one out and marks it applied.
  // Dropping one is therefore not a judgement about an action the agent would have taken,
  // so declining it — and closing the investigation on top of it — asks for no reason.
  const proposeTodo = async ({
    request,
    conversationId,
    proposal: { title, comment, impact, confidence },
  }: Parameters<RecorderProposals['propose']>[0]) => {
    await proposals.createProposal({
      request,
      spaceId: getSpaceId(request),
      conversationId,
      proposal: {
        title,
        comment,
        impact,
        confidence,
        origin: 'nightshift',
        category: PROPOSAL_CATEGORY_TODO,
        skipDiscardReason: true,
      },
    });
  };

  return {
    listTitles: async ({ request, conversationId }) => {
      // The list reads as the internal user, so the caller's own privilege decides what they may see.
      // Without it, a user who can use the investigation but not proposals would have the titles
      // shown to the recorder's model.
      try {
        await proposals.getProposalPrivileges().assertCanRead(request);
      } catch {
        return [];
      }
      const { proposals: found } = await proposals.getProposalsService().list(
        {
          conversationId,
          origin: 'nightshift',
          excludeSuperseded: true,
          excludeExpired: false,
          size: MAX_LISTED_PROPOSALS,
          from: 0,
        },
        getSpaceId(request),
        request
      );
      return found.map(({ title }) => title);
    },

    // Only the space's own workflows: managed actions belong to the solution that installed them
    // (AlertZero's host isolation, say) and are not Nightshift's to propose. And only `always-gate`
    // ones: the input is written by the model, so a person must approve every run of it.
    // A workflow whose input schema is too large to show is left out rather than cut: the model
    // could not fill a truncated schema correctly, and an unlisted workflow cannot be proposed.
    listActions: async ({ request }) => {
      const { actions } = await proposals.listActions(getSpaceId(request), request, {
        managedFilter: 'unmanaged',
      });
      return actions
        .filter((action) => action.approvalPolicy === 'always-gate' && fitsPrompt(action))
        .slice(0, MAX_RECORDER_ACTIONS)
        .map(shortenDescription);
    },

    propose: async (args) => {
      const { request, conversationId, proposal } = args;
      const { action_workflow_id: actionWorkflowId, action_input: actionInput } = proposal;
      if (!actionWorkflowId) {
        await proposeTodo(args);
        return;
      }
      // Gated: approving it runs the workflow as the person who approved it. Its category,
      // and its impact when the model gave none, come from the workflow's own metadata.
      await proposals.createProposal({
        request,
        spaceId: getSpaceId(request),
        conversationId,
        proposal: {
          title: proposal.title,
          comment: proposal.comment,
          impact: proposal.impact,
          confidence: proposal.confidence,
          origin: 'nightshift',
          actionWorkflowId,
          actionInput,
        },
      });
    },
  };
};
