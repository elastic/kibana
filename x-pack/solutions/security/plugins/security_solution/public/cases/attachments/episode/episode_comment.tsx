/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import type { EpisodeAttachmentMetadata } from '../../../../common/cases/attachments/episode';
import * as i18n from './translations';

export interface EpisodeCommentProps {
  episodeId: string;
  metadata?: EpisodeAttachmentMetadata;
}

/**
 * Simple activity-feed comment shown when an episode is attached to a case — the v2 analog of the
 * "attached alert" comment.
 */
export const EpisodeComment: React.FC<EpisodeCommentProps> = memo(({ episodeId, metadata }) => {
  const title = metadata?.title ?? episodeId;
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      data-test-subj={`episode-attachment-comment-${episodeId}`}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="warning" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{i18n.ADDED_EPISODE_LABEL}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>
      {metadata?.status ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{metadata.status}</EuiBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
});

EpisodeComment.displayName = 'EpisodeComment';
