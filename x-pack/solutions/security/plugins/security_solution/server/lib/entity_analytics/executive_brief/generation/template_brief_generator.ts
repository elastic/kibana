/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STORY_EDGE_CONFIG } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  AttackStage,
  BriefConfidence,
  BriefEntity,
  BriefNarrationMode,
  BriefSnapshot,
  BlindSpotGap,
  EvidenceId,
  ExecutiveBrief,
  ExecutiveBriefDecision,
  ExecutiveBriefStoryline,
  StoryEdge,
  StoryEdgeType,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type { BriefGenerationInput, BriefGenerationResult, BriefGenerator } from './types';

const MAX_PAIR_SENTENCES = 3;
const MAX_TITLE_LENGTH = 70;
const MAX_FACT_ENTITIES = 3;
const MAX_DECISIONS = 5;
const MAX_COVERAGE_DECISIONS = 2;
const MAX_STAGE_SENTENCES = 3;
const MAX_GAP_SENTENCES = 3;

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];
const ORDINAL_WORDS = [
  'zeroth',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
];

const numberWord = (n: number): string => NUMBER_WORDS[n] ?? String(n);
const ordinalWord = (n: number): string => ORDINAL_WORDS[n] ?? `${n}th`;
const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const joinList = (items: string[]): string => {
  if (items.length <= 1) {
    return items.join('');
  }
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

const unique = <T>(items: T[]): T[] => [...new Set(items)];

const CRITICALITY_LABEL: Record<string, string> = {
  extreme_impact: 'extreme impact',
  high_impact: 'high impact',
};

const CRITICALITY_SCORE: Record<string, number> = { extreme_impact: 3, high_impact: 2 };

const RANGE_PHRASE: Record<string, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

const SEVERITY_ORDER: Record<BlindSpotGap['severity'], number> = { danger: 0, warning: 1, info: 2 };
const URGENCY_ORDER: Record<ExecutiveBriefDecision['urgency'], number> = {
  now: 0,
  this_week: 1,
  next_review: 2,
};

/**
 * The relation clause of a storyline narrative: one typed edge, using exactly the verb in
 * `STORY_EDGE_CONFIG`. Symmetric edges are written "A and B ...".
 */
const edgeClause = (type: StoryEdgeType, from: string, to: string): string => {
  const { verb } = STORY_EDGE_CONFIG[type];
  switch (type) {
    case 'same_ad':
      return `${from} and ${to} were ${verb}`;
    case 'co_alert':
      return `${from} and ${to} ${verb}`;
    case 'lead_related':
      return `${from} and ${to} were ${verb}`;
    default:
      return `${from} ${verb} ${to}`;
  }
};

interface TemplateContext {
  snapshot: BriefSnapshot;
  mode: BriefNarrationMode;
  entity: (euid: string) => BriefEntity | undefined;
  /** `names` mode uses display names; `ids_only` mode uses the ENT id so no name leaks. */
  label: (euid: string) => string;
  entityEvidence: (euid: string) => EvidenceId[];
  valid: (ids: readonly string[]) => EvidenceId[];
  tacticName: (tacticId: string) => string | undefined;
  hasDataGaps: boolean;
  rangePhrase: string;
}

const createTemplateContext = (
  snapshot: BriefSnapshot,
  mode: BriefNarrationMode
): TemplateContext => {
  const stagesById = new Map(snapshot.blindSpots.attackStages.stages.map((s) => [s.tacticId, s]));
  const entity = (euid: string): BriefEntity | undefined => snapshot.entities[euid];
  const valid = (ids: readonly string[]): EvidenceId[] =>
    unique(
      ids.filter((id): id is EvidenceId =>
        Object.prototype.hasOwnProperty.call(snapshot.catalog, id)
      )
    );
  return {
    snapshot,
    mode,
    entity,
    label: (euid) => {
      const found = entity(euid);
      if (!found) {
        return euid;
      }
      return mode === 'names' ? found.name : found.evidenceId;
    },
    entityEvidence: (euid) => {
      const found = entity(euid);
      return found ? valid([found.evidenceId]) : [];
    },
    valid,
    tacticName: (tacticId) => stagesById.get(tacticId)?.tacticName,
    hasDataGaps: Object.values(snapshot.sources).some(
      ({ status }) => status === 'error' || status === 'timeout' || status === 'missing_index'
    ),
    rangePhrase: RANGE_PHRASE[snapshot.timeRange.range] ?? snapshot.timeRange.range,
  };
};

const primaryEuid = (storyline: Storyline): string | undefined => storyline.entityEuids[0];

const responsePhrase = (storyline: Storyline): string => {
  switch (storyline.response.state) {
    case 'unaddressed':
      return 'no one is working this yet';
    case 'in_progress':
      return 'it is already being handled';
    default:
      return 'it has been contained';
  }
};

/** "a.rodriguez: Initial Access → Lateral Movement", from the first and last observed tactic. */
const buildTitle = (ctx: TemplateContext, storyline: Storyline): string => {
  const primary = primaryEuid(storyline);
  const names = storyline.tacticIds.flatMap((id) => {
    const name = ctx.tacticName(id);
    return name ? [name] : [];
  });
  const stages =
    names.length >= 2
      ? `${names[0]} → ${names[names.length - 1]}`
      : names.length === 1
      ? names[0]
      : 'Connected activity';
  if (!primary) {
    return stages;
  }
  const label = ctx.label(primary);
  const room = MAX_TITLE_LENGTH - stages.length - 2;
  const subject = label.length > room ? `${label.slice(0, Math.max(room - 1, 1))}…` : label;
  return `${subject}: ${stages}`;
};

const buildNarrative = (ctx: TemplateContext, storyline: Storyline): string => {
  const sentences: string[] = [];

  // One sentence per entity pair, using only the strongest verb (highest edge weight).
  const ordered = [...storyline.edges]
    .map((edge, position) => ({ edge, position }))
    .sort((a, b) => b.edge.weight - a.edge.weight || a.position - b.position)
    .map(({ edge }) => edge);
  const strongestByPair = new Map<string, StoryEdge>();
  ordered.forEach((edge) => {
    const key = [edge.from, edge.to].sort().join('\u0000');
    if (!strongestByPair.has(key)) {
      strongestByPair.set(key, edge);
    }
  });

  const covered = new Set<string>();
  let shown = 0;
  strongestByPair.forEach((edge) => {
    covered.add(edge.from);
    covered.add(edge.to);
    if (shown >= MAX_PAIR_SENTENCES) {
      return;
    }
    shown += 1;
    sentences.push(`${edgeClause(edge.type, ctx.label(edge.from), ctx.label(edge.to))}.`);
  });
  if (strongestByPair.size > MAX_PAIR_SENTENCES) {
    sentences.push('Further links are shown in the storyline graph.');
  }

  storyline.entityEuids
    .filter((euid) => !covered.has(euid))
    .forEach((euid) => sentences.push(`${ctx.label(euid)} is part of this storyline.`));

  const stageNames = storyline.tacticIds.flatMap((id) => {
    const name = ctx.tacticName(id);
    return name ? [name] : [];
  });
  if (stageNames.length > 0) {
    sentences.push(`Activity progressed through ${joinList(stageNames)}.`);
  }

  if (sentences.length === 0) {
    return 'No entities were resolved for this storyline.';
  }
  return sentences.join(' ');
};

const entityFactScore = (entity: BriefEntity): number =>
  (entity.isPrivileged ? 3 : 0) +
  (entity.criticality ? CRITICALITY_SCORE[entity.criticality] ?? 0 : 0) +
  (entity.watchlists.length > 0 ? 1 : 0) +
  (entity.vulnerabilities &&
  (entity.vulnerabilities.critical > 0 || entity.vulnerabilities.high > 0)
    ? 1
    : 0);

const entityFactSentence = (ctx: TemplateContext, entity: BriefEntity): string => {
  const label = ctx.label(entity.euid);
  const isParts: string[] = [];
  if (entity.isPrivileged) {
    isParts.push('privileged');
  }
  if (entity.watchlists.length > 0) {
    isParts.push(
      `on the ${joinList(entity.watchlists)} ${
        entity.watchlists.length === 1 ? 'watchlist' : 'watchlists'
      }`
    );
  }
  const criticality = entity.criticality ? CRITICALITY_LABEL[entity.criticality] : undefined;
  if (criticality) {
    isParts.push(criticality);
  }
  const vulnerabilities = entity.vulnerabilities;
  const vulnerabilityText =
    vulnerabilities && (vulnerabilities.critical > 0 || vulnerabilities.high > 0)
      ? `has ${vulnerabilities.critical} critical and ${vulnerabilities.high} high vulnerabilities`
      : undefined;

  const parts: string[] = [];
  if (isParts.length > 0) {
    parts.push(`is ${joinList(isParts)}`);
  }
  if (vulnerabilityText) {
    parts.push(vulnerabilityText);
  }
  return `${label} ${parts.join(' and ')}.`;
};

const rankedFactEntities = (ctx: TemplateContext, storyline: Storyline): BriefEntity[] =>
  storyline.entityEuids
    .flatMap((euid, position) => {
      const entity = ctx.entity(euid);
      return entity && entityFactScore(entity) > 0
        ? [{ entity, score: entityFactScore(entity), position }]
        : [];
    })
    .sort((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, MAX_FACT_ENTITIES)
    .map(({ entity }) => entity);

const buildWhyItMatters = (ctx: TemplateContext, storyline: Storyline): string => {
  const sentences: string[] = [];
  const facts = rankedFactEntities(ctx, storyline);
  if (facts.length === 0) {
    sentences.push(
      'No criticality, privilege or vulnerability context is available for these entities.'
    );
  } else {
    facts.forEach((entity) => sentences.push(entityFactSentence(ctx, entity)));
  }

  const { response } = storyline;
  switch (response.state) {
    case 'unaddressed':
      sentences.push('No case is open and no one is working this yet.');
      break;
    case 'in_progress':
      sentences.push('A case is already in progress for this storyline.');
      break;
    default:
      sentences.push('This storyline has been contained.');
  }
  if (response.alerts.open > 0) {
    sentences.push(`${response.alerts.open} alerts are still open.`);
  }
  if (response.alerts.acknowledged > 0) {
    sentences.push(`${response.alerts.acknowledged} alerts are acknowledged.`);
  }

  const strength: Record<Storyline['linkStrength'], string> = {
    strong:
      'The link is strong: it is backed by a discovered attack or by alerts the entities share.',
    moderate: 'The link is moderate: it relies on observed relationships between the entities.',
    weak: 'The link is weak: it relies only on attached context.',
  };
  sentences.push(strength[storyline.linkStrength]);
  return sentences.join(' ');
};

const buildConfidence = (ctx: TemplateContext, storyline: Storyline): BriefConfidence => {
  const base: Record<Storyline['linkStrength'], BriefConfidence> = {
    strong: 'high',
    moderate: 'medium',
    weak: 'low',
  };
  const lowered: Record<BriefConfidence, BriefConfidence> = {
    high: 'medium',
    medium: 'low',
    low: 'low',
  };
  const confidence = base[storyline.linkStrength];
  return ctx.hasDataGaps ? lowered[confidence] : confidence;
};

const storylineEvidence = (ctx: TemplateContext, storyline: Storyline): EvidenceId[] =>
  ctx.valid([
    storyline.evidenceId,
    ...storyline.entityEuids.flatMap((euid) => ctx.entityEvidence(euid)),
    ...storyline.edges.flatMap((edge) => edge.evidenceIds),
    ...storyline.seeds.map((seed) => seed.evidenceId),
    ...storyline.response.cases.map((c) => c.evidenceId),
    ...storyline.tacticIds.map((id) => `TAC-${id}`),
  ]);

const buildStorylines = (ctx: TemplateContext): ExecutiveBriefStoryline[] =>
  ctx.snapshot.storylines.storylines.map((storyline) => ({
    storylineId: storyline.evidenceId,
    title: buildTitle(ctx, storyline),
    narrative: buildNarrative(ctx, storyline),
    whyItMatters: buildWhyItMatters(ctx, storyline),
    confidence: buildConfidence(ctx, storyline),
    evidence: storylineEvidence(ctx, storyline),
  }));

const statPhrase = (
  stat: { value: number; previous?: number; delta?: number },
  subject: (value: number) => string
): string => {
  const base = subject(stat.value);
  if (stat.previous === undefined || stat.delta === undefined) {
    return base;
  }
  if (stat.delta > 0) {
    return `${base}, up ${stat.delta} from ${stat.previous}`;
  }
  if (stat.delta < 0) {
    return `${base}, down ${Math.abs(stat.delta)} from ${stat.previous}`;
  }
  return `${base}, unchanged`;
};

const buildGlance = (ctx: TemplateContext): ExecutiveBrief['glance'] => {
  const { snapshot } = ctx;
  const { storylines } = snapshot.storylines;
  const top = storylines[0];
  const topPrimary = top ? primaryEuid(top) : undefined;

  const headline = top
    ? `The most serious storyline${
        topPrimary ? ` centres on ${ctx.label(topPrimary)}` : ''
      } and ${responsePhrase(top)}`
    : 'No connected threat storylines were found in this period';

  const sentences: string[] = [];
  if (storylines.length > 0) {
    sentences.push(
      `${capitalise(numberWord(storylines.length))} connected ${
        storylines.length === 1 ? 'storyline is' : 'storylines are'
      } active in the last ${ctx.rangePhrase}.`
    );
    storylines.forEach((storyline) => {
      const primary = primaryEuid(storyline);
      sentences.push(
        `The ${ordinalWord(storyline.rank)} storyline (${storyline.severity}) ${
          primary ? `centres on ${ctx.label(primary)} and ` : ''
        }${responsePhrase(storyline)}.`
      );
    });
  } else {
    sentences.push(`No connected threat storylines were found in the last ${ctx.rangePhrase}.`);
  }

  const material = snapshot.glance.stats.find(({ id }) => id === 'materialRiskEntities');
  if (material) {
    sentences.push(
      `${capitalise(
        statPhrase(
          material,
          (v) => `${v} ${v === 1 ? 'entity carries' : 'entities carry'} material risk`
        )
      )}.`
    );
  }
  const signals = snapshot.glance.stats.find(({ id }) => id === 'activeSignals');
  if (signals) {
    sentences.push(`${capitalise(statPhrase(signals, (v) => `${v} signals are active`))}.`);
  }

  const evidence = top
    ? ctx.valid(storylines.map((s) => s.evidenceId))
    : ctx.valid(
        snapshot.glance.exposureLeaders.slice(0, 3).flatMap((euid) => ctx.entityEvidence(euid))
      );

  return { headline, threatNarrative: sentences.join(' '), evidence };
};

const hasActivity = (stage: AttackStage): boolean =>
  stage.observed.alerts + stage.observed.attackDiscoveries + stage.observed.mlAnomalies > 0;

const flaggedActiveStages = (ctx: TemplateContext): AttackStage[] =>
  ctx.snapshot.blindSpots.attackStages.stages.filter(
    (stage) => stage.flag !== 'none' && hasActivity(stage)
  );

const coverageSentence = (stage: AttackStage): string => {
  const { enabled, effective } = stage.coverage;
  if (enabled === 0) {
    return `${stage.tacticName} has activity but no enabled detection rules.`;
  }
  if (effective === 0) {
    return `${stage.tacticName} has activity but none of its ${enabled} enabled detection rules are working.`;
  }
  return `${stage.tacticName} has activity but only ${effective} of ${enabled} enabled detection rules are working.`;
};

const buildCrossStorylineConclusion = (
  ctx: TemplateContext
): ExecutiveBrief['crossStorylineConclusion'] => {
  const { storylines } = ctx.snapshot.storylines;
  const top = storylines[0];
  if (!top) {
    return undefined;
  }

  const flagged = flaggedActiveStages(ctx).find((stage) => top.tacticIds.includes(stage.tacticId));
  if (flagged) {
    const coverage =
      flagged.flag === 'no_working_detection'
        ? 'no working detection coverage'
        : 'limited detection coverage';
    return {
      statement: `The most serious storyline passes through ${flagged.tacticName}, a stage with ${coverage}.`,
      confidence: ctx.hasDataGaps ? 'low' : 'medium',
      evidence: ctx.valid([top.evidenceId, flagged.evidenceId]),
    };
  }

  const hubCounts = new Map<string, Storyline[]>();
  storylines.forEach((storyline) =>
    storyline.hubEuids.forEach((euid) =>
      hubCounts.set(euid, [...(hubCounts.get(euid) ?? []), storyline])
    )
  );
  const shared = [...hubCounts.entries()].find(([, list]) => list.length >= 2);
  if (shared) {
    const [euid, list] = shared;
    return {
      statement: `${ctx.label(euid)} is shared infrastructure attached to ${numberWord(
        list.length
      )} storylines, so a problem there would affect all of them.`,
      confidence: ctx.hasDataGaps ? 'low' : 'medium',
      evidence: ctx.valid([...list.map((s) => s.evidenceId), ...ctx.entityEvidence(euid)]),
    };
  }
  return undefined;
};

const buildBlindSpots = (ctx: TemplateContext): ExecutiveBrief['blindSpots'] => {
  const { blindSpots } = ctx.snapshot;
  const sentences: string[] = [];
  const evidence: string[] = [];

  const flagged = flaggedActiveStages(ctx).slice(0, MAX_STAGE_SENTENCES);
  flagged.forEach((stage) => {
    sentences.push(coverageSentence(stage));
    evidence.push(stage.evidenceId);
  });

  const gaps = [...blindSpots.gaps]
    .map((gap, position) => ({ gap, position }))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.gap.severity] - SEVERITY_ORDER[b.gap.severity] || a.position - b.position
    )
    .slice(0, MAX_GAP_SENTENCES)
    .map(({ gap }) => gap);
  gaps.forEach((gap) => {
    sentences.push(`${gap.title.replace(/\.+$/, '')}.`);
    evidence.push(gap.evidenceId);
  });

  const { unmapped } = blindSpots.attackStages;
  if (
    unmapped.alerts > 0 &&
    unmapped.share > 0 &&
    !blindSpots.gaps.some((g) => g.signal === 'B16')
  ) {
    sentences.push(`${Math.round(unmapped.share * 100)}% of alerts have no MITRE ATT&CK mapping.`);
    evidence.push(...unmapped.topRuleEvidenceIds);
  }

  if (sentences.length === 0) {
    sentences.push('No blind spots were flagged in this period.');
    evidence.push(
      ...blindSpots.attackStages.stages
        .filter(hasActivity)
        .slice(0, 5)
        .map((stage) => stage.evidenceId)
    );
  }
  return { summary: sentences.join(' '), evidence: ctx.valid(evidence) };
};

const buildDecisions = (ctx: TemplateContext): ExecutiveBriefDecision[] => {
  const decisions: ExecutiveBriefDecision[] = [];

  ctx.snapshot.storylines.storylines
    .filter((storyline) => storyline.response.state === 'unaddressed')
    .forEach((storyline) => {
      const primary = primaryEuid(storyline);
      if (!primary) {
        return;
      }
      const facts = rankedFactEntities(ctx, storyline).slice(0, 2);
      const rationale = [
        `No one is working this storyline yet, and it is ranked ${ordinalWord(storyline.rank)}.`,
        ...facts.map((entity) => entityFactSentence(ctx, entity)),
      ].join(' ');
      const urgent = storyline.severity === 'critical' || storyline.severity === 'high';
      decisions.push({
        action: `Contain activity centred on ${ctx.label(primary)} and open a case`,
        rationale,
        urgency: urgent ? 'now' : 'this_week',
        owner: 'soc',
        relatesTo: storyline.evidenceId,
        targets: unique([
          ...ctx.entityEvidence(primary),
          ...facts.flatMap((entity) => ctx.entityEvidence(entity.euid)),
        ]).slice(0, 3),
        evidence: ctx.valid([
          storyline.evidenceId,
          ...storyline.seeds.map((seed) => seed.evidenceId),
          ...storyline.edges.flatMap((edge) => edge.evidenceIds).slice(0, 2),
        ]),
        agentPrompt: `Investigate activity involving ${ctx.label(primary)} over the last ${
          ctx.rangePhrase
        } and propose containment steps.`,
      });
    });

  flaggedActiveStages(ctx)
    .slice(0, MAX_COVERAGE_DECISIONS)
    .forEach((stage) => {
      decisions.push({
        action: `Review detection coverage for ${stage.tacticName}`,
        rationale: coverageSentence(stage).replace(
          /^.*? has activity but /,
          'Activity was seen in a stage where '
        ),
        urgency: 'this_week',
        owner: 'detection_engineering',
        relatesTo: stage.evidenceId,
        targets: [stage.evidenceId],
        evidence: ctx.valid([stage.evidenceId, ...stage.topRuleEvidenceIds]),
        agentPrompt: `Which ${stage.tacticName} detection rules are enabled but not working, and which available prebuilt rules would close the gap?`,
      });
    });

  return decisions
    .map((decision, position) => ({ decision, position }))
    .sort(
      (a, b) =>
        URGENCY_ORDER[a.decision.urgency] - URGENCY_ORDER[b.decision.urgency] ||
        a.position - b.position
    )
    .slice(0, MAX_DECISIONS)
    .map(({ decision }) => decision);
};

/** The template "at a glance" on its own, used when the model's glance cannot be kept. */
export const buildTemplateGlance = (
  snapshot: BriefSnapshot,
  mode: BriefNarrationMode
): ExecutiveBrief['glance'] => buildGlance(createTemplateContext(snapshot, mode));

/**
 * Deterministic generator: prose is assembled from the snapshot only. Relations use exactly the
 * verb of their typed edge, numbers come from the snapshot, and every claim cites catalog ids.
 */
export class TemplateBriefGenerator implements BriefGenerator {
  public readonly kind = 'template' as const;

  public async generate({ snapshot, mode }: BriefGenerationInput): Promise<BriefGenerationResult> {
    const ctx = createTemplateContext(snapshot, mode);
    const crossStorylineConclusion = buildCrossStorylineConclusion(ctx);
    const brief: ExecutiveBrief = {
      glance: buildGlance(ctx),
      storylines: buildStorylines(ctx),
      ...(crossStorylineConclusion ? { crossStorylineConclusion } : {}),
      blindSpots: buildBlindSpots(ctx),
      decisions: buildDecisions(ctx),
    };
    return { brief, model: 'template' };
  }
}
