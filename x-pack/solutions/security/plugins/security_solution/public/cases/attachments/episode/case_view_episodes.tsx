/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiBadge, EuiEmptyPrompt } from '@elastic/eui';
import { SECURITY_EPISODE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CommonAttachmentListViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { EpisodeAttachmentMetadata } from '../../../../common/cases/attachments/episode';
import * as i18n from './translations';

interface EpisodeRow extends EpisodeAttachmentMetadata {
  id: string;
}

/**
 * Reads the attached episodes straight off the case comments — the attachment stores the display
 * fields inline (`metadata`), so the table needs no re-fetch (the episode is an ES|QL projection
 * with no queryable doc). This lives next to the alerts table for now; they'll merge later.
 */
const extractEpisodes = (caseData: CommonAttachmentListViewProps['caseData']): EpisodeRow[] => {
  const rows: EpisodeRow[] = [];
  for (const comment of caseData.comments) {
    if (comment.type === SECURITY_EPISODE_ATTACHMENT_TYPE && 'attachmentId' in comment) {
      const { attachmentId, metadata } = comment as {
        attachmentId?: string;
        metadata?: EpisodeAttachmentMetadata;
      };
      if (typeof attachmentId === 'string' && attachmentId.length > 0 && metadata) {
        rows.push({ id: attachmentId, ...metadata });
      }
    }
  }
  return rows;
};

export const CaseViewEpisodes: React.FC<CommonAttachmentListViewProps> = ({ caseData }) => {
  const episodes = useMemo(() => extractEpisodes(caseData), [caseData]);

  const columns = useMemo<Array<EuiBasicTableColumn<EpisodeRow>>>(
    () => [
      { field: 'title', name: i18n.COLUMN_RULE, truncateText: true },
      {
        field: 'status',
        name: i18n.COLUMN_STATUS,
        render: (status: string) => <EuiBadge color="hollow">{status}</EuiBadge>,
      },
      { field: 'severity', name: i18n.COLUMN_SEVERITY, render: (s?: string | null) => s ?? '—' },
      { field: 'triggeredAt', name: i18n.COLUMN_TRIGGERED, render: (t?: string | null) => t ?? '—' },
    ],
    []
  );

  if (episodes.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="case-view-episodes-empty"
        iconType="warning"
        title={<h3>{i18n.EPISODE_DISPLAY_NAME}</h3>}
        body={<p>{i18n.NO_EPISODES_ATTACHED}</p>}
      />
    );
  }

  return (
    <EuiBasicTable
      data-test-subj="case-view-episodes"
      items={episodes}
      columns={columns}
      itemId="id"
    />
  );
};

CaseViewEpisodes.displayName = 'CaseViewEpisodes';
