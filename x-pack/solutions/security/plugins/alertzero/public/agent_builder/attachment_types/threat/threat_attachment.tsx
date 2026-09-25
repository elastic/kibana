/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildThreatReportLookupEsql } from '../navigation';
import {
  buildDiscoverActionButton,
  joinSubtitle,
  lazyInlineContent,
} from '../shared/attachment_definition_helpers';
import { asString } from '../shared/runtime_guards';
import { isValidThreatAttachmentData } from './types';
import type { ThreatAttachment } from './types';
import type { ThreatAttachmentInlineContentProps } from './threat_inline_content';

const DEFAULT_LABEL = i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.label', {
  defaultMessage: 'Threat Report',
});

const OPEN_REPORT_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.threat.openInDiscover',
  { defaultMessage: 'Open report in Discover' }
);

/**
 * Lazy-loaded inline renderer. Pulls the `useQuery`/`http.fetch` dependencies into their own
 * chunk so the alertzero bundle doesn't pay for them until an attachment actually renders.
 */
const LazyThreatAttachmentInlineContent = lazyInlineContent<ThreatAttachmentInlineContentProps>(
  () =>
    import(
      /* webpackChunkName: "alertzero_threat_attachment_inline" */
      './threat_inline_content'
    ).then((m) => ({ default: m.ThreatAttachmentInlineContent })),
  2
);

/**
 * Builds the `security.threat` `AttachmentUIDefinition`. Takes `http` from the plugin's
 * `start()` closure (not `useKibana`).
 */
export const createThreatAttachmentDefinition = ({
  http,
  navigation,
}: {
  http: HttpStart;
  navigation: AttachmentNavigationDeps;
}): AttachmentUIDefinition<ThreatAttachment> => ({
  // Narrowed for the same reason the inline renderer narrows them: a persisted payload can
  // carry captured fields this build no longer accepts, and the platform requires a string
  // here. An object would reach Agent Builder's own chrome, outside this renderer's control.
  getLabel: (attachment) =>
    asString(attachment?.data?.attachmentLabel) ??
    asString(attachment?.data?.title) ??
    DEFAULT_LABEL,
  getIcon: () => 'document',
  // Severity and type live in the card body; the header stays title + source · id only.
  getHeader: ({ attachment }) => {
    const data = attachment?.data;
    const subtitle = joinSubtitle(asString(data?.source), asString(data?.report_id));
    return {
      icon: 'document',
      ...(subtitle ? { subtitle } : {}),
    };
  },
  renderInlineContent: (props) => (
    <LazyThreatAttachmentInlineContent {...props} http={http} navigation={navigation} />
  ),
  getActionButtons: ({ attachment }) => {
    if (!isValidThreatAttachmentData(attachment?.data)) {
      return [];
    }
    const esql = buildThreatReportLookupEsql({
      reportId: attachment.data.report_id,
      spaceId: navigation.spaceId,
    });
    return buildDiscoverActionButton({ share: navigation.share, esql, label: OPEN_REPORT_LABEL });
  },
});
