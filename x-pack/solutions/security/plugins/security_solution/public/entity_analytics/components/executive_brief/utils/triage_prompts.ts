/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AttackStage,
  AttentionArea,
  AttentionAreaId,
  AttentionAssessment,
  AttentionLevel,
  BlindSpotGap,
  BriefEntity,
  BriefSnapshot,
  ExecutiveBrief,
  StoryEvent,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { getEntityByEuid, getEvidence, getStoryline, getTacticName } from './resolve_evidence';

/**
 * Triage prompts for the attention verdict and rows. Pure and deterministic. The text is sent to the
 * Agent Builder as-is and intentionally stays English (not i18n). Internal ids (euids, case and rule
 * UUIDs) are never included; evidence ids such as STORY-1 are used only alongside display names.
 */

export interface TriagePrompt {
  title: string;
  /** The instruction: what the agent should verify and recommend. */
  prompt: string;
  /** Markdown evidence the prompt refers to. */
  attachmentMarkdown: string;
}

type BriefLike = Pick<ExecutiveBrief, 'storylines'>;

const LEVEL_RANK: Record<AttentionLevel, number> = { urgent: 3, action: 2, watch: 1, clear: 0 };
const MAX_TIMELINE_LINES = 10;
const MAX_RULE_LINES = 8;
const MAX_LIST_LINES = 10;

/** The area that drives the verdict: the first (in display order) with the most severe level. */
export const getTopArea = (
  assessment: Pick<AttentionAssessment, 'level' | 'areas'>
): AttentionArea | undefined => {
  const order: readonly AttentionAreaId[] = ['threats', 'response', 'coverage', 'visibility'];
  const sorted = order.flatMap((id) => assessment.areas.filter((area) => area.id === id));
  return sorted.reduce<AttentionArea | undefined>(
    (top, area) => (!top || LEVEL_RANK[area.level] > LEVEL_RANK[top.level] ? area : top),
    undefined
  );
};

const humanise = (value: string): string => value.replace(/_/g, ' ');

const describeEntity = (entity: BriefEntity): string => {
  const traits = [
    entity.type,
    entity.criticality ? `criticality ${humanise(entity.criticality)}` : undefined,
    entity.isPrivileged ? 'privileged' : undefined,
    entity.riskLevel && entity.riskLevel !== 'Unknown' ? `risk ${entity.riskLevel}` : undefined,
  ].filter(Boolean);
  return `${entity.name} (${traits.join(', ')})`;
};

const entityNames = (snapshot: BriefSnapshot, euids: readonly string[] | undefined): string[] =>
  (euids ?? []).flatMap((euid) => {
    const entity = getEntityByEuid(snapshot, euid);
    return entity ? [entity.name] : [];
  });

const capped = (lines: string[], max: number): string[] =>
  lines.length > max ? [...lines.slice(0, max), `- ... and ${lines.length - max} more`] : lines;

const timeRangeLines = (snapshot: BriefSnapshot): string[] => [
  `Time range: ${snapshot.timeRange.from} to ${snapshot.timeRange.to} (${snapshot.timeRange.range})`,
  `Brief generated at: ${snapshot.generatedAt}`,
];

const evidenceOfKind = (area: AttentionArea, prefix: string): string[] =>
  area.evidence.filter((id) => id.startsWith(`${prefix}-`));

const storylineTitle = (
  snapshot: BriefSnapshot,
  storyline: Storyline,
  brief?: BriefLike
): string => {
  const fromBrief = brief?.storylines.find(
    ({ storylineId }) => storylineId === storyline.evidenceId
  )?.title;
  if (fromBrief) return fromBrief;
  const seedTitles = storyline.seeds.flatMap(({ evidenceId }) => {
    const entry = getEvidence(snapshot, evidenceId);
    return entry?.kind === 'attack_discovery' || entry?.kind === 'lead' ? [entry.title] : [];
  });
  if (seedTitles[0]) return seedTitles[0];
  return (
    entityNames(snapshot, storyline.entityEuids).slice(0, 3).join(', ') || storyline.evidenceId
  );
};

const triggeringStorylines = (snapshot: BriefSnapshot, area: AttentionArea): Storyline[] => {
  const all = snapshot.storylines.storylines;
  const named = evidenceOfKind(area, 'STORY').flatMap((id) => {
    const storyline = getStoryline(snapshot, id);
    return storyline ? [storyline] : [];
  });
  return named.length > 0 ? named : all.slice(0, 1);
};

const responseLine = (storyline: Storyline): string => {
  const { state, cases, alerts } = storyline.response;
  const caseText =
    cases.length > 0
      ? `cases: ${cases.map(({ title, status }) => `${title} (${status})`).join('; ')}`
      : 'no case';
  return `Response: ${humanise(state)}; alerts open ${alerts.open}, acknowledged ${
    alerts.acknowledged
  }, closed ${alerts.closed}; ${caseText}`;
};

const keyRuleLines = (snapshot: BriefSnapshot, storyline: Storyline): string[] => {
  const ids = [
    ...storyline.events.flatMap(({ sourceEvidenceIds }) => sourceEvidenceIds),
    ...storyline.edges.flatMap(({ evidenceIds }) => evidenceIds),
  ].filter((id) => id.startsWith('RULE-'));
  return capped(
    [...new Set(ids)].flatMap((id) => {
      const entry = getEvidence(snapshot, id);
      if (entry?.kind !== 'rule') return [];
      const techniques = entry.techniqueIds.length > 0 ? `; ${entry.techniqueIds.join(', ')}` : '';
      return [
        `- ${entry.name} (${id}; ${entry.severity}; ${entry.alertCount} alert${
          entry.alertCount === 1 ? '' : 's'
        }${techniques})`,
      ];
    }),
    MAX_RULE_LINES
  );
};

const timelineLines = (storyline: Storyline): string[] => {
  const highlight = (event: StoryEvent): boolean =>
    ['alert_first', 'relationship_first_seen', 'ad_generated', 'case_opened'].includes(event.type);
  return capped(
    storyline.events.filter(highlight).map((event) => `- ${event.at}: ${event.summary}`),
    MAX_TIMELINE_LINES
  );
};

const buildThreatsTriage = (
  area: AttentionArea,
  snapshot: BriefSnapshot,
  brief?: BriefLike
): TriagePrompt => {
  const [storyline] = triggeringStorylines(snapshot, area);
  if (!storyline) {
    return {
      title: 'Triage priority threats',
      prompt:
        'Triage the priority threats in this brief. First verify what the evidence shows, then recommend containment and whether a case should be opened.',
      attachmentMarkdown: ['## Evidence', '', area.summary, '', ...timeRangeLines(snapshot)].join(
        '\n'
      ),
    };
  }
  const title = storylineTitle(snapshot, storyline, brief);
  const entities = storyline.entityEuids.flatMap((euid) => {
    const entity = getEntityByEuid(snapshot, euid);
    return entity ? [`- ${describeEntity(entity)}`] : [];
  });
  const tactics = storyline.tacticIds
    .map((id) => `${getTacticName(snapshot, id)} (${id})`)
    .join(' → ');
  const rules = keyRuleLines(snapshot, storyline);
  const attachmentMarkdown = [
    `## Priority threat ${storyline.rank}: ${title} (${storyline.evidenceId})`,
    '',
    `Severity: ${storyline.severity}`,
    responseLine(storyline),
    '',
    '### Entities',
    ...entities,
    '',
    `### Tactics observed, in kill-chain order`,
    tactics || 'None recorded',
    '',
    '### Key detection rules',
    ...(rules.length > 0 ? rules : ['- None recorded']),
    '',
    '### Timeline highlights',
    ...timelineLines(storyline),
    '',
    ...timeRangeLines(snapshot),
  ].join('\n');
  return {
    title: `Triage priority threat ${storyline.rank}: ${title}`,
    prompt: [
      `Triage priority threat ${storyline.rank} ("${title}") from the Entity Analytics executive brief. The evidence is attached below.`,
      'First, verify from the live data whether this is a real compromise or benign activity, and say what you checked.',
      'Then check for related activity beyond the listed entities, recommend containment steps, and say whether a case should be opened and who should own it.',
    ].join('\n'),
    attachmentMarkdown,
  };
};

const gapLines = (snapshot: BriefSnapshot, gaps: readonly BlindSpotGap[]): string[] =>
  capped(
    gaps.map((gap) => {
      const names = entityNames(snapshot, gap.entityEuids);
      return `- ${gap.title} (${gap.evidenceId}; ${gap.severity})${
        gap.detail ? `: ${gap.detail}` : ''
      }${names.length > 0 ? `. Entities: ${names.join(', ')}` : ''}`;
    }),
    MAX_LIST_LINES
  );

const buildResponseTriage = (area: AttentionArea, snapshot: BriefSnapshot): TriagePrompt => {
  const gap = snapshot.blindSpots.gaps.find(({ signal }) => signal === 'B17');
  const uncovered = snapshot.storylines.storylines.filter(
    ({ response }) => response.alerts.open > 0 && response.cases.length === 0
  );
  const attachmentMarkdown = [
    '## Alerts without a case',
    '',
    area.summary,
    ...(gap ? ['', ...gapLines(snapshot, [gap])] : []),
    '',
    '### By priority threat',
    ...(uncovered.length > 0
      ? uncovered.map(
          (storyline) =>
            `- Threat ${storyline.rank} "${storylineTitle(snapshot, storyline)}" (${
              storyline.evidenceId
            }, ${storyline.severity}): ${
              storyline.response.alerts.open
            } open alerts, entities ${entityNames(snapshot, storyline.entityEuids).join(', ')}`
        )
      : ['- None recorded']),
    '',
    '### Response state of every priority threat',
    ...snapshot.storylines.storylines.map(
      (storyline) =>
        `- Threat ${storyline.rank} (${storyline.evidenceId}). ${responseLine(storyline)}`
    ),
    '',
    ...timeRangeLines(snapshot),
  ].join('\n');
  return {
    title: 'Triage alerts without a case',
    prompt: [
      'Triage the open high and critical alerts that have no case, from the Entity Analytics executive brief. The evidence is attached below.',
      'First, verify the current alert and case state in the live data.',
      'Then say which alerts need a case, how to group them (for example by priority threat or entity), and who should own each case.',
    ].join('\n'),
    attachmentMarkdown,
  };
};

const stageLine = (snapshot: BriefSnapshot, stage: AttackStage): string => {
  const { enabled, effective } = stage.coverage;
  const notWorking = enabled - effective;
  const rules = stage.topRuleEvidenceIds.flatMap((id) => {
    const entry = getEvidence(snapshot, id);
    return entry?.kind === 'rule' ? [`${entry.name} (${id})`] : [];
  });
  const technique = stage.topTechnique
    ? `; top technique ${stage.topTechnique.name} (${stage.topTechnique.id})`
    : '';
  return [
    `- ${stage.tacticName} (${
      stage.tacticId
    }): ${effective} of ${enabled} enabled rules working (${humanise(stage.flag)})`,
    notWorking > 0
      ? `  - ${notWorking} not working: the cause is not itemised; either the rule's integrations are not installed or its last run failed`
      : undefined,
    `  - Observed: ${stage.observed.alerts} alerts, ${stage.observed.attackDiscoveries} attack discoveries, ${stage.observed.mlAnomalies} ML anomalies${technique}`,
    rules.length > 0 ? `  - Top rules: ${rules.join(', ')}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
};

const buildCoverageTriage = (area: AttentionArea, snapshot: BriefSnapshot): TriagePrompt => {
  const { stages } = snapshot.blindSpots.attackStages;
  const named = evidenceOfKind(area, 'TAC').flatMap((id) =>
    stages.filter(({ evidenceId }) => evidenceId === id)
  );
  const selected = named.length > 0 ? named : stages.filter(({ flag }) => flag !== 'none');
  const names = selected.map(({ tacticName }) => tacticName);
  const subject = names.length > 0 ? names.join(', ') : 'detection coverage';
  return {
    title: `Triage detection coverage: ${subject}`,
    prompt: [
      `Assess the detection coverage gap for ${subject} from the Entity Analytics executive brief. The evidence is attached below.`,
      'First, verify in the live data which rules are enabled and which are failing or missing integrations, and compare with the activity observed.',
      'Then recommend fixes: which rules to enable or repair and which integrations to install, in priority order.',
    ].join('\n'),
    attachmentMarkdown: [
      '## Detection coverage',
      '',
      area.summary,
      '',
      '### Stages',
      ...(selected.length > 0
        ? selected.map((stage) => stageLine(snapshot, stage))
        : ['- None recorded']),
      '',
      ...timeRangeLines(snapshot),
    ].join('\n'),
  };
};

const buildVisibilityTriage = (area: AttentionArea, snapshot: BriefSnapshot): TriagePrompt => {
  const { gaps } = snapshot.blindSpots;
  const named = evidenceOfKind(area, 'GAP').flatMap((id) =>
    gaps.filter(({ evidenceId }) => evidenceId === id)
  );
  const selected = named.length > 0 ? named : gaps.filter(({ group }) => group !== 'response_gap');
  return {
    title: 'Triage visibility gaps',
    prompt: [
      'Assess the visibility gaps from the Entity Analytics executive brief. The evidence is attached below.',
      'First, verify in the live data that each gap still exists and how many entities it affects.',
      'Then explain the impact on detection and investigation, and prioritise the fixes.',
    ].join('\n'),
    attachmentMarkdown: [
      '## Visibility gaps',
      '',
      area.summary,
      '',
      '### Gaps',
      ...(selected.length > 0 ? gapLines(snapshot, selected) : ['- None recorded']),
      '',
      ...timeRangeLines(snapshot),
    ].join('\n'),
  };
};

export const buildTriagePrompt = (
  area: AttentionArea,
  snapshot: BriefSnapshot,
  brief?: BriefLike
): TriagePrompt => {
  switch (area.id) {
    case 'threats':
      return buildThreatsTriage(area, snapshot, brief);
    case 'response':
      return buildResponseTriage(area, snapshot);
    case 'coverage':
      return buildCoverageTriage(area, snapshot);
    case 'visibility':
      return buildVisibilityTriage(area, snapshot);
  }
};

/** The single message sent to the Agent Builder: instruction, then the evidence. */
export const buildTriageMessage = ({ prompt, attachmentMarkdown }: TriagePrompt): string =>
  `${prompt}\n\n---\n\n${attachmentMarkdown}`;

const leadingCount = (summary: string): number | undefined => {
  const match = /^(\d+)\b/.exec(summary);
  return match ? Number(match[1]) : undefined;
};

/** Short, deterministic "what to do next" for an area, using counts from the summary. */
export const buildNextStep = (area: AttentionArea, snapshot: BriefSnapshot): string => {
  switch (area.id) {
    case 'threats': {
      const [storyline] = triggeringStorylines(snapshot, area);
      return storyline
        ? `Triage Threat ${storyline.rank} and decide on ownership`
        : 'Triage the priority threats and decide on ownership';
    }
    case 'response': {
      const count =
        snapshot.blindSpots.gaps.find(({ signal }) => signal === 'B17')?.value ??
        leadingCount(area.summary);
      return count !== undefined
        ? `Assign the ${count} unowned high/critical alerts`
        : 'Assign the unowned high/critical alerts';
    }
    case 'coverage': {
      const [tactic] = evidenceOfKind(area, 'TAC');
      const name = tactic
        ? snapshot.blindSpots.attackStages.stages.find(({ evidenceId }) => evidenceId === tactic)
            ?.tacticName
        : area.summary.split(':')[0];
      return name && name.length < 40 ? `Review ${name} detection` : 'Review detection coverage';
    }
    case 'visibility':
      return 'Close the visibility gaps';
  }
};
