/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackStage,
  AttentionArea,
  AttentionAssessment,
  AttentionLevel,
  BlindSpotGap,
  BlindSpotGroup,
  BriefBlindSpots,
  BriefEntity,
  BriefGlance,
  EvidenceId,
  StorylinesResult,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';

/** The deterministic snapshot parts the assessment is computed from (a `BriefSnapshot` fits). */
export interface AttentionInput {
  glance: Pick<BriefGlance, 'stats'>;
  storylines: Pick<StorylinesResult, 'storylines'>;
  blindSpots: BriefBlindSpots;
  /** Entity records keyed by golden euid. */
  entities: Record<string, BriefEntity>;
}

/** Severity order of the levels: higher is more severe. */
export const ATTENTION_LEVEL_RANK: Record<AttentionLevel, number> = {
  clear: 0,
  watch: 1,
  action: 2,
  urgent: 3,
};

const EXTREME_IMPACT = 'extreme_impact';
const MAX_VISIBILITY_PHRASES = 2;

const plural = (count: number, singular: string, pluralForm: string): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];

const mostSevere = (levels: readonly AttentionLevel[]): AttentionLevel =>
  levels.reduce<AttentionLevel>(
    (max, level) => (ATTENTION_LEVEL_RANK[level] > ATTENTION_LEVEL_RANK[max] ? level : max),
    'clear'
  );

const stageHasActivity = ({ observed }: AttackStage): boolean =>
  observed.alerts + observed.attackDiscoveries + observed.mlAnomalies > 0;

// ---------------------------------------------------------------------------------------------
// Threats
// ---------------------------------------------------------------------------------------------

interface UrgencyReasons {
  severity?: 'critical' | 'high';
  extremeImpact: boolean;
  privileged: boolean;
}

/** Why an unaddressed storyline is urgent; `undefined` when it is not. */
const urgencyReasons = (
  storyline: Storyline,
  entities: Record<string, BriefEntity>
): UrgencyReasons | undefined => {
  const members = storyline.entityEuids.flatMap((euid) =>
    entities[euid] === undefined ? [] : [entities[euid]]
  );
  const severity =
    storyline.severity === 'critical' || storyline.severity === 'high'
      ? storyline.severity
      : undefined;
  const extremeImpact = members.some(({ criticality }) => criticality === EXTREME_IMPACT);
  const privileged = members.some(({ isPrivileged }) => isPrivileged);
  return severity || extremeImpact || privileged
    ? { severity, extremeImpact, privileged }
    : undefined;
};

const urgencyRule = ({ severity, extremeImpact, privileged }: UrgencyReasons): string => {
  const involves = [
    ...(privileged ? ['a privileged identity'] : []),
    ...(extremeImpact ? ['an extreme-impact asset'] : []),
  ].join(' and ');
  return `unaddressed ${severity ? `${severity} ` : ''}threat${
    involves ? ` involves ${involves}` : ''
  }`;
};

const urgentThreatsLabel = (severities: ReadonlyArray<Storyline['severity']>): string => {
  if (severities.every((severity) => severity === 'critical')) {
    return 'critical ';
  }
  if (severities.every((severity) => severity === 'high')) {
    return 'high-severity ';
  }
  if (severities.every((severity) => severity === 'critical' || severity === 'high')) {
    return 'critical/high ';
  }
  return '';
};

const assessThreats = (
  storylines: readonly Storyline[],
  entities: Record<string, BriefEntity>
): AttentionArea => {
  if (storylines.length === 0) {
    return {
      id: 'threats',
      level: 'clear',
      summary: 'No priority threats',
      rule: 'no priority threats in the period',
      evidence: [],
    };
  }

  const unaddressed = storylines.filter(({ response }) => response.state === 'unaddressed');
  const urgent = unaddressed.flatMap((storyline) => {
    const reasons = urgencyReasons(storyline, entities);
    return reasons ? [{ storyline, reasons }] : [];
  });
  const unresolved = unique(
    unaddressed.flatMap(({ entityEuids }) =>
      entityEuids.filter((euid) => entities[euid] === undefined)
    )
  ).length;
  // A missing entity record cannot escalate the level, so say so instead of hiding it.
  const unresolvedNote =
    unresolved > 0 ? `; details missing for ${plural(unresolved, 'entity', 'entities')}` : '';

  if (urgent.length > 0) {
    const label = urgentThreatsLabel(urgent.map(({ storyline }) => storyline.severity));
    return {
      id: 'threats',
      level: 'urgent',
      summary: `${urgent.length} ${label}${urgent.length === 1 ? 'threat' : 'threats'} unaddressed`,
      rule: `${unique(urgent.map(({ reasons }) => urgencyRule(reasons))).join(
        '; '
      )}${unresolvedNote}`,
      evidence: urgent.map(({ storyline }) => storyline.evidenceId),
    };
  }
  if (unaddressed.length > 0) {
    return {
      id: 'threats',
      level: 'action',
      summary: `${plural(unaddressed.length, 'threat', 'threats')} unaddressed`,
      rule: `unaddressed threat with no case or acknowledged alert${unresolvedNote}`,
      evidence: unaddressed.map(({ evidenceId }) => evidenceId),
    };
  }

  const inProgress = storylines.filter(({ response }) => response.state === 'in_progress').length;
  const contained = storylines.length - inProgress;
  const parts = [
    ...(inProgress > 0 ? [`${plural(inProgress, 'threat', 'threats')} being handled`] : []),
    ...(contained > 0
      ? [`${inProgress > 0 ? contained : plural(contained, 'threat', 'threats')} contained`]
      : []),
  ];
  return {
    id: 'threats',
    level: 'watch',
    summary: parts.join(', '),
    rule: 'priority threats exist but none is unaddressed',
    evidence: storylines.map(({ evidenceId }) => evidenceId),
  };
};

// ---------------------------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------------------------

const noCaseSummary = (value: number | undefined): string => {
  if (value === undefined) {
    return 'High/critical alerts have no case';
  }
  return `${value} high/critical ${value === 1 ? 'alert has' : 'alerts have'} no case`;
};

const assessResponse = (
  storylines: readonly Storyline[],
  gaps: readonly BlindSpotGap[]
): AttentionArea => {
  const noCaseGap = gaps.find(({ signal }) => signal === 'B17');
  if (noCaseGap) {
    return {
      id: 'response',
      level: 'action',
      summary: noCaseSummary(noCaseGap.value),
      rule: 'open high/critical alerts in priority threats have no case',
      evidence: [noCaseGap.evidenceId],
    };
  }

  const unaddressed = storylines.filter(({ response }) => response.state === 'unaddressed');
  if (unaddressed.length > 0) {
    return {
      id: 'response',
      level: 'action',
      summary: `${plural(unaddressed.length, 'threat has', 'threats have')} no owner`,
      rule: 'unaddressed threat has no case or acknowledged alert',
      evidence: unaddressed.map(({ evidenceId }) => evidenceId),
    };
  }

  const inProgress = storylines.filter(({ response }) => response.state === 'in_progress');
  if (inProgress.length > 0) {
    const openCaseIds = unique(
      inProgress.flatMap(({ response }) =>
        response.cases.filter(({ status }) => status !== 'closed').map(({ caseId }) => caseId)
      )
    );
    const acknowledgedOnly = inProgress.filter(({ response }) =>
      response.cases.every(({ status }) => status === 'closed')
    ).length;
    const parts = [
      ...(openCaseIds.length > 0
        ? [`${plural(openCaseIds.length, 'case', 'cases')} in progress`]
        : []),
      ...(acknowledgedOnly > 0
        ? [`${plural(acknowledgedOnly, 'threat', 'threats')} acknowledged, no case`]
        : []),
    ];
    return {
      id: 'response',
      level: 'watch',
      summary: parts.join(', '),
      rule: 'a priority threat is being worked and not yet contained',
      evidence: inProgress.map(({ evidenceId }) => evidenceId),
    };
  }

  return {
    id: 'response',
    level: 'clear',
    summary: storylines.length === 0 ? 'Nothing to respond to' : 'All threats have an owner',
    rule: storylines.length === 0 ? 'no priority threats' : 'no unaddressed threats',
    evidence: [],
  };
};

// ---------------------------------------------------------------------------------------------
// Detection coverage
// ---------------------------------------------------------------------------------------------

const brokenRules = ({ coverage }: AttackStage): number =>
  Math.max(coverage.enabled - coverage.effective, 0);

const stagePhrase = (stage: AttackStage): string => {
  const { enabled, effective } = stage.coverage;
  if (enabled === 0) {
    return `${stage.tacticName}: no rules enabled`;
  }
  if (enabled > effective) {
    return `${stage.tacticName}: ${enabled - effective} of ${plural(
      enabled,
      'rule',
      'rules'
    )} not working`;
  }
  return `${stage.tacticName}: no working detection`;
};

const assessCoverage = (
  stages: readonly AttackStage[],
  storylines: readonly Storyline[]
): AttentionArea => {
  const unaddressedTactics = new Set(
    storylines
      .filter(({ response }) => response.state === 'unaddressed')
      .flatMap(({ tacticIds }) => tacticIds)
  );
  const noWorking = stages.filter(({ flag }) => flag === 'no_working_detection');
  const degradedOnThreat = stages.filter(
    (stage) =>
      stage.flag !== 'no_working_detection' &&
      stage.coverage.enabled > stage.coverage.effective &&
      unaddressedTactics.has(stage.tacticId)
  );
  const byImpact = (a: AttackStage, b: AttackStage): number =>
    brokenRules(b) - brokenRules(a) || a.position - b.position;
  const problems = [...noWorking.sort(byImpact), ...degradedOnThreat.sort(byImpact)];

  if (problems.length > 0) {
    const [top, ...rest] = problems;
    const more = rest.length > 0 ? ` · +${plural(rest.length, 'more stage', 'more stages')}` : '';
    return {
      id: 'coverage',
      level: 'action',
      summary: `${stagePhrase(top)}${more}`,
      rule: unique([
        ...(noWorking.length > 0 ? ['stage with activity has no working detection'] : []),
        ...(degradedOnThreat.length > 0
          ? ['detection rules not working in a stage of an unaddressed threat']
          : []),
      ]).join('; '),
      evidence: problems.map(({ evidenceId }) => evidenceId),
    };
  }

  const limited = stages.filter(({ flag }) => flag === 'limited_coverage');
  if (limited.length > 0) {
    return {
      id: 'coverage',
      level: 'watch',
      summary: `Limited coverage on ${plural(limited.length, 'stage', 'stages')} with activity`,
      rule: 'limited detection coverage on stages with activity',
      evidence: limited.map(({ evidenceId }) => evidenceId),
    };
  }

  return {
    id: 'coverage',
    level: 'clear',
    summary: stages.some(stageHasActivity)
      ? 'Working coverage on all active stages'
      : 'No stages with activity',
    rule: 'no stage flagged',
    evidence: [],
  };
};

// ---------------------------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------------------------

const VISIBILITY_GROUPS: ReadonlyArray<{ group: BlindSpotGroup; label: string }> = [
  { group: 'analytics_not_running', label: 'analytics not running' },
  { group: 'data_not_collected', label: 'data not collected' },
  { group: 'context_missing', label: 'context missing' },
];

const GAP_SEVERITY_RANK: Record<BlindSpotGap['severity'], number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

const signalNumber = ({ signal }: BlindSpotGap): number => Number(signal.slice(1));

/** Short, fixed phrase per signal; other signals in the visibility groups use their own title. */
const gapPhrase = (gap: BlindSpotGap): string => {
  const { value } = gap;
  switch (gap.signal) {
    case 'B12':
      return 'ML off';
    case 'B10':
      return 'Attack Discovery not running';
    case 'B11':
      return 'Hunting leads stale';
    case 'B13':
      return 'Risk scoring stale';
    case 'B5':
      return value === undefined
        ? 'Identities unresolved'
        : `${plural(value, 'identity', 'identities')} unresolved`;
    case 'B6':
      return value === undefined
        ? 'Key assets without criticality'
        : `${plural(value, 'key asset', 'key assets')} without criticality`;
    case 'B1':
      return 'No identity provider data';
    case 'B9':
      return 'Some entity types not monitored';
    case 'B15':
      return 'No vulnerability data';
    default:
      return gap.title.replace(/\.+$/, '');
  }
};

const assessVisibility = (gaps: readonly BlindSpotGap[]): AttentionArea => {
  const relevant = gaps
    .filter(({ group }) => VISIBILITY_GROUPS.some((entry) => entry.group === group))
    .sort(
      (a, b) =>
        GAP_SEVERITY_RANK[a.severity] - GAP_SEVERITY_RANK[b.severity] ||
        signalNumber(a) - signalNumber(b)
    );

  if (relevant.length === 0) {
    return {
      id: 'visibility',
      level: 'clear',
      summary: 'All analytics running',
      rule: 'no analytics, data or context gaps',
      evidence: [],
    };
  }

  const groupsPresent = VISIBILITY_GROUPS.filter(({ group }) =>
    relevant.some((gap) => gap.group === group)
  ).map(({ label }) => label);
  const phrases = unique(relevant.map(gapPhrase)).slice(0, MAX_VISIBILITY_PHRASES);
  return {
    id: 'visibility',
    // Visibility can ask for a look, never for action.
    level: 'watch',
    summary: phrases.join(' · '),
    rule: groupsPresent.join('; '),
    evidence: unique<EvidenceId>(relevant.map(({ evidenceId }) => evidenceId)),
  };
};

// ---------------------------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------------------------

const trendOf = (stats: BriefGlance['stats']): AttentionAssessment['trend'] => {
  const delta = stats.find(({ id }) => id === 'activeSignals')?.delta;
  if (delta === undefined || !Number.isFinite(delta)) {
    return undefined;
  }
  return delta > 0 ? 'more' : delta < 0 ? 'less' : 'same';
};

/**
 * Deterministic attention assessment (no LLM): four areas, each with a level, fact and rule, and
 * an overall level that is the most severe area level. The trend is display only.
 */
export const assessAttention = ({
  glance,
  storylines,
  blindSpots,
  entities,
}: AttentionInput): AttentionAssessment => {
  const areas: AttentionArea[] = [
    assessThreats(storylines.storylines, entities),
    assessResponse(storylines.storylines, blindSpots.gaps),
    assessCoverage(blindSpots.attackStages.stages, storylines.storylines),
    assessVisibility(blindSpots.gaps),
  ];
  const trend = trendOf(glance.stats);
  return {
    level: mostSevere(areas.map(({ level }) => level)),
    areas,
    ...(trend ? { trend } : {}),
  };
};
