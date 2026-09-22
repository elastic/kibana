/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildThreatReportsInEsql } from '../navigation';
import {
  buildDiscoverActionButton,
  lazyInlineContent,
} from '../shared/attachment_definition_helpers';
import { parseHuntCorrelationData } from './types';
import type { HuntCorrelationAttachment } from './types';
import type { HuntCorrelationInlineContentProps } from './hunt_correlation_inline_content';

const DEFAULT_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.label',
  { defaultMessage: 'Hunt Correlation' }
);

const ABOVE_THRESHOLD_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.aboveThreshold',
  { defaultMessage: 'Above threshold' }
);

const BELOW_THRESHOLD_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.belowThreshold',
  { defaultMessage: 'Below threshold' }
);

const OPEN_RELATED_REPORTS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.openRelatedReports',
  { defaultMessage: 'Open related reports in Discover' }
);

const LazyHuntCorrelationInlineContent = lazyInlineContent<HuntCorrelationInlineContentProps>(
  () =>
    import(
      /* webpackChunkName: "alertzero_hunt_correlation_attachment_inline" */
      './hunt_correlation_inline_content'
    ).then((m) => ({ default: m.HuntCorrelationInlineContent })),
  3
);

/**
 * Builds the `security.hunt_correlation` `AttachmentUIDefinition`. Static payload (no live
 * fetch).
 */
export const createHuntCorrelationAttachmentDefinition = ({
  navigation,
}: {
  navigation: AttachmentNavigationDeps;
}): AttachmentUIDefinition<HuntCorrelationAttachment> => ({
  getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
  getIcon: () => 'link',
  getHeader: ({ attachment }) => {
    const parsed = parseHuntCorrelationData(attachment?.data);
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

    const badges: HeaderBadge[] = [];
    const scores = parsed?.diamond_scores ?? [];
    if (scores.length > 0 && parsed?.thresholds) {
      const threshold = parsed.thresholds.diamond_vertex;
      const allAboveThreshold = scores.every((score) => score.score >= threshold);
      badges.push({
        label: allAboveThreshold ? ABOVE_THRESHOLD_LABEL : BELOW_THRESHOLD_LABEL,
        color: allAboveThreshold ? 'success' : 'hollow',
      });
    }

    return {
      icon: 'link',
      subtitle,
      badges,
    };
  },
  renderInlineContent: (props) => (
    <LazyHuntCorrelationInlineContent {...props} navigation={navigation} />
  ),
  getActionButtons: ({ attachment }) => {
    const parsed = parseHuntCorrelationData(attachment?.data);
    if (!parsed) {
      return [];
    }

    const reportIds = [...new Set(parsed.diamond_scores.map((score) => score.related_report_id))];
    const esql = reportIds.length > 0 ? buildThreatReportsInEsql({ reportIds }) : undefined;

    return buildDiscoverActionButton({
      share: navigation.share,
      esql,
      label: OPEN_RELATED_REPORTS_LABEL,
    });
  },
});
