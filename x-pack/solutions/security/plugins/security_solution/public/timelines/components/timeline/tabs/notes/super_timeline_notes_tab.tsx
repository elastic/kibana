/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ReqStatus } from '../../../../../notes';
import { NOTES_LOADING_TEST_ID } from '../../../../../notes/components/test_ids';
import { NO_NOTES_TITLE, NO_NOTES_DESCRIPTION } from '../../../super_timeline/translations';
import { SuperTimelineNotes } from '../../../super_timeline/super_timeline_notes';
import { useNotesTabData } from './use_notes_tab_data';

// Local constant — the canonical exported value lives in notes/index.tsx (tests import from there).
const FETCH_NOTES_ERROR = i18n.translate('xpack.securitySolution.notes.fetchNotesErrorLabel', {
  defaultMessage: 'Error fetching notes',
});

interface SuperTimelineNotesTabProps {
  timelineId: string;
}

export const SuperTimelineNotesTab: React.FC<SuperTimelineNotesTabProps> = React.memo(
  ({ timelineId }) => {
    const {
      notes,
      fetchStatus,
      superTimelineSourceIds,
      superTimelineSourceTitles,
      superTimelineDescriptions,
    } = useNotesTabData(timelineId);

    const isSuperTimelineEmpty =
      fetchStatus === ReqStatus.Succeeded &&
      notes.length === 0 &&
      superTimelineDescriptions.length === 0;

    return (
      <>
        {isSuperTimelineEmpty && (
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            css={css`
              height: 100%;
              padding-bottom: 10%;
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiEmptyPrompt
                iconType="documents"
                title={<h3>{NO_NOTES_TITLE}</h3>}
                body={<p>{NO_NOTES_DESCRIPTION}</p>}
                data-test-subj="super-timeline-no-notes"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {!isSuperTimelineEmpty && (
          <>
            {fetchStatus === ReqStatus.Loading && (
              <EuiLoadingElastic data-test-subj={NOTES_LOADING_TEST_ID} size="xxl" />
            )}
            {fetchStatus === ReqStatus.Failed && (
              <EuiCallOut
                announceOnMount
                title={FETCH_NOTES_ERROR}
                color="danger"
                iconType="error"
                data-test-subj="super-timeline-notes-error"
              />
            )}
            {fetchStatus === ReqStatus.Succeeded && (
              <SuperTimelineNotes
                notes={notes}
                superTimelineSourceIds={superTimelineSourceIds}
                superTimelineSourceTitles={superTimelineSourceTitles}
                superTimelineDescriptions={superTimelineDescriptions}
              />
            )}
          </>
        )}
      </>
    );
  }
);

SuperTimelineNotesTab.displayName = 'SuperTimelineNotesTab';
