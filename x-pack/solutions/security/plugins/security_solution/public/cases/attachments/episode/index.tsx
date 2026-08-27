/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { defineAttachment } from '@kbn/cases-plugin/public';
import { SECURITY_EPISODE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EpisodeAttachmentPayloadSchema } from '../../../../common/cases/attachments/episode';
import { EpisodeComment } from './episode_comment';
import * as i18n from './translations';

// Single chunk for the attachments-tab Episodes table; loaded only when the tab is opened.
const LazyCaseViewEpisodes = lazy(async () => {
  const { CaseViewEpisodes: Component } = await import('./case_view_episodes');
  return { default: Component };
});

const CaseViewEpisodesTab: React.FC<React.ComponentProps<typeof LazyCaseViewEpisodes>> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <LazyCaseViewEpisodes {...props} />
  </Suspense>
);
CaseViewEpisodesTab.displayName = 'CaseViewEpisodesTab';

/**
 * Defines the `security.episode` cases attachment (v2 alert episodes): a comment in the activity
 * feed plus a dedicated Episodes table in the attachments tab. A reference attachment storing the
 * episode id + display metadata inline, so nothing resolves against an alerts index.
 */
export const getEpisodeAttachment = () =>
  defineAttachment({
    id: SECURITY_EPISODE_ATTACHMENT_TYPE,
    getIcon: () => 'warning',
    getLabel: () => i18n.EPISODE_DISPLAY_NAME,
    schema: EpisodeAttachmentPayloadSchema,
    getCreationActivity: (props) => {
      const { attachmentId, metadata } = props;
      return {
        eventColor: 'subdued' as const,
        event: <EpisodeComment episodeId={attachmentId} metadata={metadata} />,
        deleteSuccessToast: i18n.DELETE_EPISODE_SUCCESS_TOAST,
      };
    },
    getRemovalActivity: () => ({
      event: i18n.REMOVED_EPISODE_LABEL,
    }),
    getAttachmentList: () => ({ children: CaseViewEpisodesTab }),
  });
