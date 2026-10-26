/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { MAX_COMMENT_LENGTH } from '@kbn/proposals-common';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ProposalConflictError } from '@kbn/proposals-plugin/server';
import type { LiveProposal } from './resolve_proposal_slot';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;

/**
 * The revision at which packaging stops adding to a Proposal's comment. Revision 1 is the
 * original, so a Proposal nobody else has revised gets four automatic additions (1 to 2, 2 to 3,
 * 3 to 4, 4 to 5) and then no more. Every addition is a new revision row and a new card in the
 * owner's conversation, so with no limit a busy host would pile revisions on a Proposal until its
 * comment ran out of room. Worse, an analyst reading the Proposal on revision N is refused when
 * they decide it once N+1 has landed, which was rare while only analysts revised. Past this, the
 * journal line on the converging Investigation is the pointer, and nothing is lost: the finding is
 * still covered and still visible.
 */
export const MAX_AUTOMATIC_REVISION = 5;
type ProposalPrivileges = Pick<
  ReturnType<ProposalsPluginStart['getProposalPrivileges']>,
  'canManage'
>;

/**
 * What happened to the live Proposal's comment when this run converged onto it.
 *
 * - `revised`: this Investigation was added to the comment.
 * - `same_investigation`: the Proposal is this Investigation's own (a rerun), so there is nothing
 *   to add and no note to write.
 * - `already_mentioned`: the comment already names this Investigation.
 * - `not_revisable`: an analyst has already decided it, and `revise()` refuses a decided one.
 * - `too_long`: the line would push the comment past the length the service allows.
 * - `revision_limit`: the Proposal has reached revision {@link MAX_AUTOMATIC_REVISION}.
 * - `failed`: the revision was refused (including for want of the privilege to manage proposals)
 *   or errored. Never fatal: the duplicate was avoided either way, and the line is a courtesy to
 *   the analyst.
 */
export type ConvergeOutcome =
  | 'revised'
  | 'same_investigation'
  | 'already_mentioned'
  | 'not_revisable'
  | 'too_long'
  | 'revision_limit'
  | 'failed';

/** The link the conversations page already copies, so an analyst lands on that Investigation. */
export const buildInvestigationLink = ({
  spaceId,
  conversationId,
}: {
  spaceId: string;
  conversationId: string;
}): string =>
  `${
    spaceId === 'default' ? '' : `/s/${spaceId}`
  }/app/alertzero?selectedConversationId=${encodeURIComponent(conversationId)}`;

const buildAlsoRaisedByLine = (link: string): string => `Also raised by [Investigation](${link}).`;

/**
 * Appends "Also raised by [Investigation]" to the live Proposal's comment through `revise()`, so
 * the analyst approves the copy that lists every Investigation that converged on the host.
 *
 * Guards, each of which skips rather than fails: the Proposal is this Investigation's own; the
 * comment already names it; it was decided since the look-up; the line would not fit. A 409 (a
 * concurrent revision or decision won) reloads the live revision and tries once more.
 *
 * Revising is a write, and the Proposals service does not check who is asking: it writes with its
 * own credentials and relies on its callers, as the revise tool and the workflow steps do. So the
 * privilege to manage proposals is checked here, last, once the guards have shown there is
 * something to write. A run that may package but may not manage proposals still converges, since
 * minting nothing is always safe, but leaves another Investigation's Proposal as it found it.
 */
export type AppendAlsoRaisedBy = (args: {
  live: LiveProposal;
  investigationConversationId: string;
}) => Promise<ConvergeOutcome>;

export const createAlsoRaisedByAppender = ({
  proposalsService,
  privileges,
  spaceId,
  request,
  logger,
}: {
  proposalsService: ProposalsService;
  privileges: ProposalPrivileges;
  spaceId: string;
  request: KibanaRequest;
  logger?: Logger;
}): AppendAlsoRaisedBy => {
  const attempt = async (
    live: LiveProposal,
    investigationConversationId: string
  ): Promise<ConvergeOutcome> => {
    if (live.conversationId === investigationConversationId) {
      return 'same_investigation';
    }
    if (!live.revisable) {
      return 'not_revisable';
    }
    if (live.comment.includes(investigationConversationId)) {
      return 'already_mentioned';
    }
    if (live.revision >= MAX_AUTOMATIC_REVISION) {
      return 'revision_limit';
    }
    const line = buildAlsoRaisedByLine(
      buildInvestigationLink({ spaceId, conversationId: investigationConversationId })
    );
    const comment = `${live.comment}\n\n${line}`;
    if (comment.length > MAX_COMMENT_LENGTH) {
      return 'too_long';
    }
    if (!(await privileges.canManage(request))) {
      logger?.warn(
        `package_report: not adding this Investigation to proposal ${live.proposalId}: the request lacks the privilege to manage proposals`
      );
      return 'failed';
    }
    await proposalsService.revise({ id: live.proposalId, comment }, spaceId, request);
    return 'revised';
  };

  return async ({ live, investigationConversationId }) => {
    try {
      return await attempt(live, investigationConversationId);
    } catch (error) {
      if (!(error instanceof ProposalConflictError)) {
        logger?.warn(
          `package_report: could not add this Investigation to proposal ${live.proposalId}: ${
            (error as Error).message
          }`
        );
        return 'failed';
      }
    }

    // A concurrent revision or decision won. Reload the live revision, which is what a 409 means
    // we were holding a stale one of, and try once more.
    try {
      const head = await proposalsService.getLatestRevision(live.proposalId, spaceId);
      const reloaded = await proposalsService.get(head.proposalId, spaceId, request);
      return await attempt(
        {
          ...live,
          proposalId: head.proposalId,
          comment: reloaded.comment,
          revision: head.revision,
          revisable: head.status === 'pending' && head.decision === undefined,
        },
        investigationConversationId
      );
    } catch (error) {
      logger?.warn(
        `package_report: could not add this Investigation to proposal ${
          live.proposalId
        } after a conflict: ${(error as Error).message}`
      );
      return 'failed';
    }
  };
};

/**
 * The journal line written on the Investigation that created nothing, saying where its finding
 * went. `undefined` when there is nothing to say: the Proposal is this Investigation's own, so a
 * rerun landing on it is not news.
 *
 * Says only what is true of the outcome: "added to that Proposal" only when it was.
 */
export const buildConvergenceNote = ({
  spaceId,
  live,
  outcome,
}: {
  spaceId: string;
  live: LiveProposal;
  outcome: ConvergeOutcome;
}): string | undefined => {
  if (outcome === 'same_investigation') {
    return undefined;
  }
  const link = buildInvestigationLink({ spaceId, conversationId: live.conversationId });
  const where = `[another Investigation](${link})`;
  const lead = live.revisable
    ? `A Proposal for "${live.title}" is already awaiting a decision, raised by ${where}.`
    : `A Proposal for "${live.title}" has already been approved and is being carried out, raised by ${where}.`;
  const added =
    outcome === 'revised' || outcome === 'already_mentioned'
      ? ' This Investigation was added to it.'
      : '';
  return `${lead} This run found the same thing, so no second Proposal was created.${added}`;
};
