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
import { STATUS_LABELS, areaFullName, sortAreas } from '../components/attention_area_rows';
import { ATTENTION_LEVEL_DISPLAY, UNAVAILABLE_LABEL } from '../components/attention_verdict';
import { formatTrendSummary, buildTrendSummary } from './trend_summary';
import { getEntityByEuid, getStoryline, getTacticName } from './resolve_evidence';

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
  lines.push('## At a glance', '');
  const { assessment } = snapshot.glance;
  if (assessment) {
    const summary = buildTrendSummary(snapshot.glance.needsAttention, snapshot.timeRange.range);
    lines.push(`**${ATTENTION_LEVEL_DISPLAY[assessment.level].label}**`, '');
    if (summary) lines.push(formatTrendSummary(summary), '');
  } else {
    lines.push(`**${UNAVAILABLE_LABEL}**`, '');
  }
  lines.push(brief.glance.headline, '');
  if (assessment) {
    sortAreas(assessment.areas).forEach((area) =>
      lines.push(`- ${areaFullName(area.id)} — ${STATUS_LABELS[area.level]}: ${area.summary}`)
    );
    lines.push('');
  }
  lines.push(brief.glance.threatNarrative, '');

  lines.push('## Priority threats', '');
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
