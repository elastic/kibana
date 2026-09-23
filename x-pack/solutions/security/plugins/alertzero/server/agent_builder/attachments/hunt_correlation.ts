/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { groupBy } from 'lodash';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import {
  huntCorrelationAttachmentDataSchema,
  type HuntCorrelationAttachmentData,
} from '../../../common/hunt_correlation_attachment_schema';
import { createReadonlyAttachmentType } from './create_readonly_attachment_type';

export const HUNT_CORRELATION_ATTACHMENT_ID = ALERTZERO_ATTACHMENT_TYPES.huntCorrelation;

const formatHuntCorrelationForAgent = (data: HuntCorrelationAttachmentData): string => {
  const lines: string[] = ['Hunt correlation evidence', '', 'Anchors:'];

  if (data.anchors.length === 0) {
    lines.push('  no anchors recorded');
  } else {
    const anchorsByKind = groupBy(data.anchors, (anchor) => anchor.kind);
    for (const [kind, anchors] of Object.entries(anchorsByKind)) {
      lines.push(`  ${kind}: ${anchors.map((anchor) => anchor.value).join(', ')}`);
    }
  }

  lines.push('', 'Diamond scores:');
  if (data.diamond_scores.length === 0) {
    lines.push('  no diamond scores recorded');
  } else {
    for (const score of data.diamond_scores) {
      lines.push(`  ${score.vertex}: ${score.related_report_id} (score ${score.score})`);
    }
  }

  lines.push(
    '',
    `Thresholds: anchor_match=${data.thresholds.anchor_match}, ` +
      `diamond_vertex=${data.thresholds.diamond_vertex}`
  );

  return lines.join('\n');
};

const describePayload = `This attachment carries report-to-report correlation evidence, built from the Diamond Model of
Intrusion Analysis (adversary, capability, infrastructure, victim).
The payload contains:
- anchors: hard matches (hash, ioc_set_hash, or actor) linking this report to others
- diamond_scores: a per-vertex similarity score against each related report, one row per
  (vertex, related_report_id) pair — a related report can appear more than once, once per vertex
  it scores against
- thresholds: the anchor_match and diamond_vertex thresholds used to decide whether a correlation
  is significant
- self_match_excluded: always true by schema — a report is never correlated against itself`;

export const createHuntCorrelationAttachmentType = (): AttachmentTypeDefinition =>
  createReadonlyAttachmentType({
    id: HUNT_CORRELATION_ATTACHMENT_ID,
    schema: huntCorrelationAttachmentDataSchema,
    formatForAgent: formatHuntCorrelationForAgent,
    describePayload,
    renderNoun: 'correlation table',
    // Worst case: 50 anchors plus 100 diamond_scores rows, roughly 157K characters.
    maxContentLength: 175_000,
  });
