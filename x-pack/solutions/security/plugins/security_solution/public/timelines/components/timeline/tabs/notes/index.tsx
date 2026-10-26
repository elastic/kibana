/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { selectIsSuperTimeline } from '../../../../store/selectors';
import {
  ReqStatus,
  selectFetchNotesBySavedObjectIdsError,
  selectFetchNotesBySavedObjectIdsStatus,
} from '../../../../../notes';
import { NOTES } from '../../../notes/translations';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { getScrollToTopSelector } from '../selectors';
import { useScrollToTop } from '../../../../../common/components/scroll_to_top';
import type { State } from '../../../../../common/store';
import { SuperTimelineNotesTab } from './super_timeline_notes_tab';
import { RegularNotesTab } from './regular_notes_tab';

export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.notes.fetchNotesErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);
export const NO_NOTES = i18n.translate('xpack.securitySolution.notes.noNotesLabel', {
  defaultMessage: 'No notes have been created for this Timeline.',
});

interface NotesTabContentProps {
  /**
   * The timeline id
   */
  timelineId: string;
}

/**
 * Renders the notes tab content.
 * Dispatches to SuperTimelineNotesTab or RegularNotesTab based on whether
 * the timeline is a super timeline.
 */
const NotesTabContentComponent: React.FC<NotesTabContentProps> = React.memo(({ timelineId }) => {
  const { addError: addErrorToast } = useAppToasts();

  const getScrollToTop = useMemo(() => getScrollToTopSelector(), []);
  const scrollToTop = useShallowEqualSelector((state) => getScrollToTop(state, timelineId));
  useScrollToTop('#scrollableNotes', !!scrollToTop);

  const isSuperTimeline = useSelector((state: State) => selectIsSuperTimeline(state, timelineId));
  const fetchStatus = useSelector((state: State) => selectFetchNotesBySavedObjectIdsStatus(state));
  const fetchError = useSelector((state: State) => selectFetchNotesBySavedObjectIdsError(state));

  useEffect(() => {
    if (fetchStatus === ReqStatus.Failed && fetchError) {
      addErrorToast(null, {
        title: FETCH_NOTES_ERROR,
      });
    }
  }, [addErrorToast, fetchError, fetchStatus]);

  return (
    <EuiPanel
      css={css`
        height: 100%;
        overflow: auto;
        /* EUI's hasShadow overlays an ::after border; with overflow:auto it cuts through content */
        &::after {
          display: none;
        }
      `}
    >
      <EuiFlexGroup
        direction="column"
        css={css`
          height: 100%;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>{NOTES}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          {isSuperTimeline ? (
            <SuperTimelineNotesTab timelineId={timelineId} />
          ) : (
            <RegularNotesTab timelineId={timelineId} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

NotesTabContentComponent.displayName = 'NotesTabContentComponent';

// eslint-disable-next-line import/no-default-export
export { NotesTabContentComponent as default };
