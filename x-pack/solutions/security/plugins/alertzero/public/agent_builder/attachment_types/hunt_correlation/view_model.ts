/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildThreatReportsInEsql } from '../navigation';
import { buildDiscoverActionButton } from '../shared/attachment_definition_helpers';
import { huntCorrelationAttachmentDataSchema } from '../../../../common/hunt_correlation_attachment_schema';
import type { HuntCorrelationAttachmentData } from '../../../../common/hunt_correlation_attachment_schema';

export type { HuntCorrelationAttachmentData };
export type HuntCorrelationAttachment = Attachment<string, HuntCorrelationAttachmentData>;
export type Anchor = HuntCorrelationAttachmentData['anchors'][number];
export type DiamondScore = HuntCorrelationAttachmentData['diamond_scores'][number];

export const OPEN_RELATED_REPORTS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.openRelatedReports',
  { defaultMessage: 'Open related reports in Discover' }
);

/** Validates a raw attachment payload against the shared zod schema. */
export const parseHuntCorrelationData = (
  candidate: unknown
): HuntCorrelationAttachmentData | undefined => {
  const result = huntCorrelationAttachmentDataSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
};

/**
 * The single Discover exit the hunt correlation header offers: all related threat reports.
 * Shared with inline content, which renders the verdict summary itself when this yields no
 * button, since Agent Builder then omits the chrome header entirely.
 */
export const buildHuntCorrelationActionButtons = ({
  parsed,
  navigation,
}: {
  parsed: HuntCorrelationAttachmentData | undefined;
  navigation: AttachmentNavigationDeps;
}): ActionButton[] => {
  if (!parsed) {
    return [];
  }

  const reportIds = [...new Set(parsed.diamond_scores.map((score) => score.related_report_id))];
  const esql =
    reportIds.length > 0
      ? buildThreatReportsInEsql({ reportIds, spaceId: navigation.spaceId })
      : undefined;

  return buildDiscoverActionButton({
    share: navigation.share,
    esql,
    label: OPEN_RELATED_REPORTS_LABEL,
  });
};

const ABOVE_THRESHOLD_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.aboveThreshold',
  { defaultMessage: 'Above threshold' }
);

const BELOW_THRESHOLD_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.belowThreshold',
  { defaultMessage: 'Below threshold' }
);

/**
 * The correlation verdict: anchor and related-report counts plus the threshold badge.
 *
 * Shared by the chrome header and inline content. Agent Builder drops the header when an
 * attachment has no action button, which happens whenever Share or its Discover locator is
 * unavailable (`share` is optional in `kibana.jsonc`), so inline content renders this itself
 * in that case. One definition keeps the two presentations from drifting.
 */
export const buildHuntCorrelationSummary = (
  parsed: HuntCorrelationAttachmentData | undefined
): { subtitle: string; thresholdLabel?: string; allAboveThreshold: boolean } => {
  const anchorCount = parsed?.anchors.length ?? 0;
  const reportCount = parsed
    ? new Set(parsed.diamond_scores.map((score) => score.related_report_id)).size
    : 0;

  const subtitle = i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.huntCorrelation.heroSummary',
    {
      defaultMessage:
        '{anchorCount, plural, one {# anchor} other {# anchors}} · {reportCount, plural, one {# related report} other {# related reports}}',
      values: { anchorCount, reportCount },
    }
  );

  const scores = parsed?.diamond_scores ?? [];
  if (scores.length === 0 || !parsed?.thresholds) {
    return { subtitle, allAboveThreshold: false };
  }

  const allAboveThreshold = scores.every(
    (score) => score.score >= parsed.thresholds.diamond_vertex
  );
  return {
    subtitle,
    thresholdLabel: allAboveThreshold ? ABOVE_THRESHOLD_LABEL : BELOW_THRESHOLD_LABEL,
    allAboveThreshold,
  };
};
