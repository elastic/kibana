/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  BriefSnapshot,
  ExecutiveBriefDecision,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { getEntityByEuid, getStoryline } from './resolve_evidence';

/**
 * Builds the initial Agent Builder message for a decision: the decision's own agentPrompt plus a
 * markdown evidence attachment for the storyline / tactic / gap it relates to. Intentionally English.
 */
export const buildDecisionPrompt = (
  decision: ExecutiveBriefDecision,
  snapshot: BriefSnapshot
): string => {
  const lines: string[] = [decision.agentPrompt, '', '---', '', '## Evidence', ''];
  const { relatesTo } = decision;
  const entry = snapshot.catalog[relatesTo];

  if (entry?.kind === 'story') {
    const storyline = getStoryline(snapshot, relatesTo);
    if (storyline) {
      lines.push(`Storyline ${storyline.rank} (${storyline.severity} severity)`);
      lines.push(
        `Entities: ${storyline.entityEuids
          .map((euid) => getEntityByEuid(snapshot, euid)?.name ?? euid)
          .join(', ')}`
      );
      storyline.events.forEach((event) => lines.push(`- ${event.at}: ${event.summary}`));
    }
  } else if (entry?.kind === 'tactic') {
    const stage = snapshot.blindSpots.attackStages.stages.find(
      (s) => s.tacticId === entry.tacticId
    );
    if (stage) {
      lines.push(
        `${stage.tacticName}: ${stage.observed.alerts} alerts, ${stage.coverage.effective}/${stage.coverage.enabled} rules working (${stage.flag})`
      );
    }
  } else if (entry?.kind === 'gap') {
    const gap = snapshot.blindSpots.gaps.find(({ signal }) => signal === entry.signal);
    if (gap) lines.push(`${gap.title}${gap.detail ? ` - ${gap.detail}` : ''}`);
  }

  lines.push('', `Time range: ${snapshot.timeRange.from} to ${snapshot.timeRange.to}`);
  return lines.join('\n');
};
