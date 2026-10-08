/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  EvidenceId,
  ExecutiveBriefJob,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { getEntityByEuid, getStoryline, getTacticName } from './resolve_evidence';

const GLANCE_LABELS: Record<string, string> = {
  postureScore: 'Posture score',
  materialRiskEntities: 'Material-risk entities',
  activeSignals: 'Active signals',
  stagesWithActivity: 'Stages with activity',
};

const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

/** Plain-English markdown rendering of a succeeded job, used by "Copy as markdown". */
export const briefToMarkdown = (job: ExecutiveBriefJob): string => {
  const { snapshot, brief } = job;
  if (!snapshot || !brief) return '';
  const lines: string[] = [];
  const nameOf = (euid: string): string => getEntityByEuid(snapshot, euid)?.name ?? euid;
  const label = (id: EvidenceId): string => {
    const entry = snapshot.catalog[id];
    if (entry?.kind === 'entity') return nameOf(entry.euid);
    if (entry?.kind === 'rule') return entry.name;
    if (entry?.kind === 'attack_discovery' || entry?.kind === 'lead' || entry?.kind === 'case') {
      return entry.title;
    }
    return id;
  };

  lines.push('# Executive brief', '');
  lines.push(`Time range: ${snapshot.timeRange.range} (generated ${snapshot.generatedAt})`, '');
  lines.push('## At a glance', '', `**${brief.glance.headline}**`, '');
  snapshot.glance.stats.forEach((stat) => {
    const delta = stat.delta !== undefined ? ` (${signed(stat.delta)} vs previous)` : '';
    lines.push(`- ${GLANCE_LABELS[stat.id] ?? stat.id}: ${stat.value}${delta}`);
  });
  lines.push('', brief.glance.threatNarrative, '');

  lines.push('## Storylines', '');
  if (brief.storylines.length === 0) lines.push('No connected activity.', '');
  brief.storylines.forEach((story) => {
    const computed = getStoryline(snapshot, story.storylineId);
    lines.push(`### ${story.title}`, '');
    lines.push(
      `Severity: ${computed?.severity ?? 'n/a'} | Confidence: ${story.confidence} | Response: ${
        computed?.response.state ?? 'n/a'
      }`,
      ''
    );
    if (computed) {
      lines.push(`Entities: ${computed.entityEuids.map(nameOf).join(', ')}`, '');
    }
    lines.push(story.narrative, '', `Why it matters: ${story.whyItMatters}`, '');
    if (computed?.events.length) {
      lines.push('Timeline:');
      computed.events.forEach((event) => lines.push(`- ${event.at}: ${event.summary}`));
      if (computed.eventsTruncated > 0) lines.push(`- +${computed.eventsTruncated} more`);
      lines.push('');
    }
  });
  if (brief.crossStorylineConclusion) {
    lines.push(brief.crossStorylineConclusion.statement, '');
  }

  lines.push('## Blind spots', '', brief.blindSpots.summary, '');
  snapshot.blindSpots.attackStages.stages.forEach((stage) => {
    const flag =
      stage.flag === 'limited_coverage'
        ? ' - Limited coverage'
        : stage.flag === 'no_working_detection'
        ? ' - No working detection'
        : '';
    lines.push(
      `- ${stage.tacticName}: ${stage.observed.alerts} alerts, ${stage.coverage.effective}/${stage.coverage.enabled} rules working${flag}`
    );
  });
  lines.push('');
  snapshot.blindSpots.gaps.forEach((gap) => lines.push(`- ${gap.title}`));
  lines.push('');

  lines.push('## Decisions', '');
  brief.decisions.forEach((decision, index) => {
    const target = decision.targets.map(label).join(', ');
    lines.push(
      `${index + 1}. **${decision.action}** (${decision.urgency.replace('_', ' ')})`,
      `   - ${decision.rationale}`
    );
    if (target) lines.push(`   - Targets: ${target}`);
    lines.push(
      `   - Relates to: ${label(decision.relatesTo)} (${getTacticOrId(
        snapshot,
        decision.relatesTo
      )})`
    );
  });
  return lines.join('\n');
};

const getTacticOrId = (
  snapshot: NonNullable<ExecutiveBriefJob['snapshot']>,
  id: EvidenceId
): string => (id.startsWith('TAC-') ? getTacticName(snapshot, id.slice(4)) : id);
