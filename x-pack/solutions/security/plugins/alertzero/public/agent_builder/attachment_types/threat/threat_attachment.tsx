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
import type { HttpStart } from '@kbn/core-http-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import {
  buildDiscoverEsqlUrl,
  buildThreatReportLookupEsql,
} from '../navigation';
import { isValidThreatAttachmentData } from './types';
import type { ThreatAttachment } from './types';

const DEFAULT_LABEL = i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.label', {
  defaultMessage: 'Threat Report',
});

/**
 * Lazy-loaded inline renderer — pulls the `useQuery`/`http.fetch` dependencies into their own
 * chunk so the alertzero bundle doesn't pay for them until an attachment actually renders.
 */
const LazyThreatAttachmentInlineContent = React.lazy(() =>
  import(
    /* webpackChunkName: "alertzero_threat_attachment_inline" */
    './threat_inline_content'
  ).then((m) => ({ default: m.ThreatAttachmentInlineContent }))
);

/**
 * Builds the `security.threat` `AttachmentUIDefinition`. Takes `http` from the plugin's
 * `start()` closure (not `useKibana`) per the plan's Phase 2 contract.
 */
export const createThreatAttachmentDefinition = ({
  http,
  navigation,
}: {
  http: HttpStart;
  navigation: AttachmentNavigationDeps;
}): AttachmentUIDefinition<ThreatAttachment> => ({
  getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
  getIcon: () => 'warning',
  renderInlineContent: (props) => (
    <React.Suspense fallback={<EuiSkeletonText lines={2} />}>
      <LazyThreatAttachmentInlineContent {...props} http={http} navigation={navigation} />
    </React.Suspense>
  ),
  getActionButtons: ({ attachment }) => {
    if (!isValidThreatAttachmentData(attachment?.data)) {
      return [];
    }

    const esql = buildThreatReportLookupEsql({ reportId: attachment.data.report_id });
    const href = buildDiscoverEsqlUrl({ share: navigation.share, esql });
    if (!href) {
      return [];
    }

    return [
      {
        label: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.openInDiscover', {
          defaultMessage: 'Open report in Discover',
        }),
        icon: 'discoverApp',
        type: ActionButtonType.SECONDARY,
        href,
        openInNewTab: true,
        handler: () => undefined,
      },
    ];
  },
});
