/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import { getDeckFeatureForGithubEpicKey } from '../config/workflows_deck_epic_correlation';
import { resolveRoadmapForEpic, UNMAPPED_ROADMAP_GROUP_TITLE } from '../config/roadmap_mapping';
import {
  buildPhasePayload,
  computeDeliveryCoveragePct,
  computeGateRollup,
  computeP4Gate,
  computeP5Gate,
  rollupPullRequests,
  rollupTickets,
} from './phase_gates';
import {
  attributeTeam,
  resolveContributingOrgTeams,
  resolveOrgTeamsFromLabels,
  resolveOrgTeamsFromProjectTeam,
} from './team_attribution';
import type { GitHubIssueLike } from './types';

export interface BuildEpicPhaseInput {
  readonly epicKey: string;
  readonly displayId: string;
  readonly title: string;
  readonly summary?: string;
  readonly owner?: string;
  readonly projectItemId: string;
  readonly projectNumber: number;
  readonly projectUrl?: string;
  readonly issueRef?: { repo?: string; number?: number; nodeId?: string; url?: string };
  readonly fields: Record<string, string>;
  readonly epicLabels?: readonly string[];
  readonly links?: {
    readonly project_url?: string;
    readonly prd_url?: string;
    readonly arch_url?: string;
  };
  readonly childIssues: readonly GitHubIssueLike[];
  readonly childPullRequests: ReadonlyArray<{ merged?: boolean; state?: string; draft?: boolean }>;
  readonly ticketsByRepo: ReadonlyArray<{
    repo: string;
    items: ReadonlyArray<{
      issueRef: string;
      number?: number;
      title: string;
      status: string;
      prRefs: readonly string[];
    }>;
  }>;
}

const notStartedPhase = (): Record<string, unknown> => ({ gate: 'ns' });

const getDeckCorrelation = (epicKey: string) => getDeckFeatureForGithubEpicKey(epicKey);

export const buildEpicPhaseDocument = (input: BuildEpicPhaseInput): Record<string, unknown> => {
  const roadmap = resolveRoadmapForEpic({
    epicKey: input.epicKey,
    initiative: input.fields['Product Initiative'],
    projectNumber: input.projectNumber,
  });
  const ticketRollup = rollupTickets(input.childIssues);
  const prRollup = rollupPullRequests(input.childPullRequests);
  const p4Gate = computeP4Gate(ticketRollup);
  const p5Gate = computeP5Gate(ticketRollup, prRollup);
  const deliveryCoveragePct = computeDeliveryCoveragePct(ticketRollup, prRollup);
  const gateRollup = computeGateRollup([p4Gate, p5Gate]);

  const ownOrgTeamOrder = [
    ...resolveOrgTeamsFromProjectTeam(input.fields.Team),
    ...resolveOrgTeamsFromLabels(input.epicLabels),
    ...resolveOrgTeamsFromLabels(input.childIssues[0]?.labels),
  ];
  const ownOrgTeams = [...new Set(ownOrgTeamOrder)];

  const ownAttribution = attributeTeam({
    projectTeam: input.fields.Team,
    labels: input.epicLabels ?? input.childIssues[0]?.labels,
  });

  const contributingOrgTeams = new Set<string>([
    ...resolveContributingOrgTeams({
      projectTeam: input.fields.Team,
      labels: input.epicLabels,
    }),
  ]);
  const contributingEngineeringTeams = new Set<string>();
  if (input.fields.Team) {
    contributingEngineeringTeams.add(input.fields.Team);
  }
  for (const issue of input.childIssues) {
    for (const orgTeam of resolveContributingOrgTeams({ labels: issue.labels })) {
      contributingOrgTeams.add(orgTeam);
    }
    const labelAttribution = attributeTeam({ labels: issue.labels });
    if (labelAttribution.engineeringTeam) {
      contributingEngineeringTeams.add(labelAttribution.engineeringTeam);
    }
  }

  const epicStatus =
    input.fields.Status === 'Done' || input.fields.Status === 'Done - Verified in Serverless'
      ? 'closed'
      : p4Gate === 'warn' || p5Gate === 'warn'
      ? 'in-progress'
      : 'open';

  return {
    '@timestamp': new Date().toISOString(),
    roadmap: {
      id: roadmap?.id ?? 'unmapped',
      title: roadmap?.title ?? UNMAPPED_ROADMAP_GROUP_TITLE,
      product: roadmap?.product ?? 'Unknown',
    },
    epic: {
      key: input.epicKey,
      display_id: input.displayId,
      title: input.title,
      summary: input.summary ?? input.fields.Epic ?? input.title,
      owner: input.owner,
      teams: [...contributingEngineeringTeams],
      url: input.issueRef?.url,
      project_item_id: input.projectItemId,
      issue_ref: input.issueRef,
    },
    teams: {
      own_org_team: ownOrgTeams[0],
      own_engineering_team: input.fields.Team ?? ownAttribution.engineeringTeam,
      contributing_org_teams: [...contributingOrgTeams],
      contributing_engineering_teams: [...contributingEngineeringTeams],
      cross_team: contributingOrgTeams.size > 1,
      team_count: contributingOrgTeams.size,
    },
    release: {
      milestone: input.fields['Release Milestone'],
      priority: input.fields['Release Priority'],
      roadmap_stage: input.fields['Product Roadmap Stage'],
      initiative: input.fields['Product Initiative'],
      serverless_iteration: input.fields.Serverless,
      deck_feature: getDeckCorrelation(input.epicKey)?.deckFeature,
      deck_bucket: getDeckCorrelation(input.epicKey)?.deckBucket,
    },
    links: {
      project_url: input.links?.project_url ?? input.projectUrl,
      prd_url: input.links?.prd_url,
      arch_url: input.links?.arch_url,
    },
    phases: {
      p1_prd: notStartedPhase(),
      p2_arch: notStartedPhase(),
      p3_ai_coverage: notStartedPhase(),
      p4_tickets: buildPhasePayload(p4Gate, {
        total: ticketRollup.total,
        ai_gen: ticketRollup.aiGen,
        eng_validated: ticketRollup.engValidated,
        done: ticketRollup.done,
        open: ticketRollup.open,
        in_progress: ticketRollup.inProgress,
        ai_gen_pct:
          ticketRollup.total > 0 ? Math.round((ticketRollup.aiGen / ticketRollup.total) * 100) : 0,
        eng_validated_pct:
          ticketRollup.aiGen > 0
            ? Math.round((ticketRollup.engValidated / ticketRollup.aiGen) * 100)
            : 0,
        done_pct:
          ticketRollup.total > 0 ? Math.round((ticketRollup.done / ticketRollup.total) * 100) : 0,
      }),
      p5_prs: buildPhasePayload(p5Gate, {
        total: prRollup.total,
        merged: prRollup.merged,
        open: prRollup.open,
        closed_unmerged: prRollup.closedUnmerged,
        merged_pct: prRollup.total > 0 ? Math.round((prRollup.merged / prRollup.total) * 100) : 0,
      }),
      p6_defects: notStartedPhase(),
      p7_production: notStartedPhase(),
      p8_telemetry: notStartedPhase(),
    },
    rollup: {
      coverage_pct: deliveryCoveragePct,
      delivery_coverage_pct: deliveryCoveragePct,
      gates_passed_pct: gateRollup.pct,
      gates_applicable: gateRollup.applicable,
      gates_passed: gateRollup.passed,
      status: epicStatus,
    },
    tickets_by_repo: input.ticketsByRepo,
    project: {
      number: input.projectNumber,
    },
  };
};

export const slugifyEpicKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildEpicPhaseDocumentId = ({
  roadmapId,
  epicKey,
}: {
  roadmapId: string;
  epicKey: string;
}): string => `epic:${roadmapId}:${slugifyEpicKey(epicKey)}`;
