/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { triageExcludeFromProposalStepCommonDefinition } from '../../../common/step_types/alert_triage';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../common/proposals/origin';
import {
  excludeFromProposals,
  groupExcludedAlerts,
  type ExclusionHead,
} from '../../alert_triage/exclude_from_proposal';
import { buildProposalText } from '../../alert_triage/proposal_text';
import { loadAlertsByIds } from './ports';
import { MAX_HEADS, toHead } from './group_proposals_step';

export interface ExcludeFromProposalStepDependencies {
  getProposals: () => ProposalsPluginStart;
  logger?: Logger;
}

const TAGS_PATH = ['kibana', 'alert', 'workflow_tags'] as const;

/** The tags of an alert document, read from the flat or the expanded form of the field. */
const tagsOf = (doc: Record<string, unknown>): string[] => {
  const flat = doc[TAGS_PATH.join('.')];
  const nested = TAGS_PATH.reduce<unknown>(
    (value, key) =>
      typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)[key]
        : undefined,
    doc
  );
  const tags = flat ?? nested;
  return Array.isArray(tags) ? tags.map(String) : typeof tags === 'string' ? [tags] : [];
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

export const getTriageExcludeFromProposalStepDefinition = (
  deps: ExcludeFromProposalStepDependencies
) =>
  createServerStepDefinition({
    ...triageExcludeFromProposalStepCommonDefinition,
    handler: async ({ input, contextManager }) => {
      try {
        const { spaceId } = contextManager.getContext().workflow;
        const request = contextManager.getFakeRequest();
        if (!request) {
          throw new ExecutionError({
            type: 'ApiError',
            message: 'No request available in workflow context',
          });
        }
        const { alerts } = await loadAlertsByIds(contextManager, input.alert_ids);
        const tagged = alerts.map((doc) => ({ doc, id: String(doc._id), tags: tagsOf(doc) }));
        const groups = groupExcludedAlerts(tagged);
        const empty = { proposals: [], excluded_alert_ids: [], needs_verdict_alert_ids: [] };
        if (groups.length === 0) return { output: empty };

        const { getProposalsService, getProposalPrivileges } = deps.getProposals();
        const service = getProposalsService();
        // Without the privilege no head is read and nothing is revised, so the alerts stay listed
        // and only the close re-check protects them.
        try {
          await getProposalPrivileges().assertCanRead(request);
        } catch (error) {
          deps.logger?.warn(`alert_triage exclusion: the caller cannot read proposals: ${error}`);
          return { output: empty };
        }

        const result = await excludeFromProposals(groups, {
          listHeads: async (rootIds) => {
            const { proposals, total } = await service.list(
              {
                rootProposalIds: rootIds,
                origin: ALERTZERO_PROPOSAL_ORIGIN,
                excludeSuperseded: true,
                excludeExpired: false,
                size: MAX_HEADS,
                from: 0,
              },
              spaceId,
              request
            );
            if (total > proposals.length) {
              throw new Error(
                `The proposal lookup matched ${total} and returned ${proposals.length}`
              );
            }
            return proposals.map(
              (proposal): ExclusionHead => ({ ...toHead(proposal), comment: proposal.comment })
            );
          },
          revise: async (head, remainingIds, excluded) => {
            const { alerts: remaining } = await loadAlertsByIds(contextManager, remainingIds);
            // The title of the proposal does not depend on the rule or the floor, so rebuilding it
            // only refreshes its count and entities. The comment keeps its text and gains a line.
            const { title } = buildProposalText({
              alerts: remaining,
              ruleName: '',
              confidenceFloor: 0,
              kind: 'keyed',
            });
            const truePositives =
              excluded.truePositiveCount > 0
                ? ` ${excluded.truePositiveCount} of them marked true positive, so the pattern may be too coarse.`
                : '';
            const note = `${plural(
              excluded.count,
              'alert'
            )} excluded by analysts since this proposal was created.${truePositives} ${plural(
              remainingIds.length,
              'alert'
            )} remain.`;
            return service.revise(
              {
                id: head.proposalId,
                title,
                comment: [head.comment, note].filter(Boolean).join('\n\n'),
                actionInput: { alertIds: remainingIds },
              },
              spaceId,
              request
            );
          },
          onError: (message) => deps.logger?.warn(`alert_triage exclusion: ${message}`),
        });

        const excluded = new Set(result.flatMap(({ excludedIds }) => excludedIds));
        const needsVerdict = tagged
          .filter(
            ({ id, tags }) =>
              excluded.has(id) &&
              !tags.includes('az:true_positive') &&
              !tags.includes('az:inconclusive')
          )
          .map(({ id }) => id);
        return {
          output: {
            proposals: result.map((entry) => ({
              root_proposal_id: entry.rootProposalId,
              conversation_id: entry.conversationId,
              revision: entry.revision,
              excluded_count: entry.excludedIds.length,
              true_positive_count: entry.truePositiveCount,
              remaining_count: entry.remainingCount,
              revised: entry.revised,
            })),
            excluded_alert_ids: [...excluded],
            needs_verdict_alert_ids: needsVerdict,
          },
        };
      } catch (error) {
        throw error instanceof ExecutionError
          ? error
          : new ExecutionError({
              type: 'ApiError',
              message:
                error instanceof Error ? error.message : 'Failed to exclude alerts from proposals',
            });
      }
    },
  });
