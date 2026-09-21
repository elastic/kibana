/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSkeletonText } from '@elastic/eui';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildDiscoverEsqlUrl, buildThreatReportsInEsql } from '../navigation';
import { parseHuntCorrelationData } from './types';
import type { HuntCorrelationAttachment } from './types';

const DEFAULT_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.label',
  { defaultMessage: 'Hunt Correlation' }
);

const LazyHuntCorrelationInlineContent = React.lazy(() =>
  import(
    /* webpackChunkName: "alertzero_hunt_correlation_attachment_inline" */
    './hunt_correlation_inline_content'
  ).then((m) => ({ default: m.HuntCorrelationInlineContent }))
);

/**
 * Builds the `security.hunt_correlation` `AttachmentUIDefinition`. Static payload (no live
 * fetch), kept as a factory to mirror the sibling types' registration shape.
 */
export const createHuntCorrelationAttachmentDefinition = ({
  navigation,
}: {
  navigation: AttachmentNavigationDeps;
}): AttachmentUIDefinition<HuntCorrelationAttachment> => ({
  getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
  getIcon: () => 'link',
  renderInlineContent: (props) => (
    <React.Suspense fallback={<EuiSkeletonText lines={3} />}>
      <LazyHuntCorrelationInlineContent {...props} navigation={navigation} />
    </React.Suspense>
  ),
  getActionButtons: ({ attachment }) => {
    const parsed = parseHuntCorrelationData(attachment?.data);
    if (!parsed) {
      return [];
    }

    const reportIds = [...new Set(parsed.diamondScores.map((score) => score.related_report_id))];
    if (reportIds.length === 0) {
      return [];
    }

    const esql = buildThreatReportsInEsql({ reportIds });
    if (!esql) {
      return [];
    }

    const href = buildDiscoverEsqlUrl({ share: navigation.share, esql });
    if (!href) {
      return [];
    }

    return [
      {
        label: i18n.translate(
          'xpack.alertzero.agentBuilder.attachments.huntCorrelation.openRelatedReports',
          { defaultMessage: 'Open related reports in Discover' }
        ),
        icon: 'discoverApp',
        type: ActionButtonType.SECONDARY,
        href,
        openInNewTab: true,
        handler: () => undefined,
      },
    ];
  },
});
