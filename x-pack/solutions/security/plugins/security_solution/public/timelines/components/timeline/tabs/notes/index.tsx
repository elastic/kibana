/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiAvatar,
  EuiComment,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { TimelineModel } from '../../../../..';
import { SaveTimelineCallout } from '../../../notes/save_timeline';
import { AddNote } from '../../../../../notes/components/add_note';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import {
  NOTES_LOADING_TEST_ID,
  TIMELINE_DESCRIPTION_COMMENT_TEST_ID,
} from '../../../../../notes/components/test_ids';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { ADDED_A_DESCRIPTION } from '../../../open_timeline/note_previews/translations';
import { defaultToEmptyTag, getEmptyValue } from '../../../../../common/components/empty_value';
import { selectTimelineById } from '../../../../store/selectors';
import {
  fetchNotesBySavedObjectIds,
  ReqStatus,
  selectFetchNotesBySavedObjectIdsError,
  selectFetchNotesBySavedObjectIdsStatus,
  selectSortedNotesBySavedObjectId,
} from '../../../../../notes';
import type { Note } from '../../../../../../common/api/timeline';
import { TimelineStatusEnum } from '../../../../../../common/api/timeline';
import { NotesList } from '../../../../../notes/components/notes_list';
import { OldNotes } from '../../../notes/old_notes';
import { Participants } from '../../../notes/participants';
import { NOTES } from '../../../notes/translations';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { getScrollToTopSelector } from '../selectors';
import { useScrollToTop } from '../../../../../common/components/scroll_to_top';
import type { State } from '../../../../../common/store';

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
 * At this time the component support the old notes system and the new notes system (via the securitySolutionNotesDisabled feature flag).
 * The old notes system is deprecated and will be removed in the future.
 * In both cases, the component fetches the notes for the timeline and renders:
 * - the timeline description
 * - the notes list
 * - the participants list
 * - the markdown to create a new note and the add note button
 */
const NotesTabContentComponent: React.FC<NotesTabContentProps> = React.memo(({ timelineId }) => {
  const { addError: addErrorToast } = useAppToasts();
  const dispatch = useDispatch();

  const { notesPrivileges } = useUserPrivileges();
  const canCreateNotes = notesPrivileges.crud;

  const securitySolutionNotesDisabled = useIsExperimentalFeatureEnabled(
    'securitySolutionNotesDisabled'
  );

  const getScrollToTop = useMemo(() => getScrollToTopSelector(), []);
  const scrollToTop = useShallowEqualSelector((state) => getScrollToTop(state, timelineId));
  useScrollToTop('#scrollableNotes', !!scrollToTop);

  const timeline: TimelineModel = useSelector((state: State) =>
    selectTimelineById(state, timelineId)
  );
  const timelineSavedObjectId = useMemo(
    () => timeline.savedObjectId ?? '',
    [timeline.savedObjectId]
  );
  const isTimelineSaved: boolean = useMemo(
    () => timeline.status === TimelineStatusEnum.active,
    [timeline.status]
  );

  const fetchNotes = useCallback(
    () => dispatch(fetchNotesBySavedObjectIds({ savedObjectIds: [timelineSavedObjectId] })),
    [dispatch, timelineSavedObjectId]
  );

  useEffect(() => {
    if (isTimelineSaved) {
      fetchNotes();
    }
  }, [fetchNotes, isTimelineSaved]);

  const notes: Note[] = useSelector((state: State) =>
    selectSortedNotesBySavedObjectId(state, {
      savedObjectId: timelineSavedObjectId,
      sort: { field: 'created', direction: 'asc' },
    })
  );
  const fetchStatus = useSelector((state: State) => selectFetchNotesBySavedObjectIdsStatus(state));
  const fetchError = useSelector((state: State) => selectFetchNotesBySavedObjectIdsError(state));

  // show a toast if the fetch notes call fails
  useEffect(() => {
    if (fetchStatus === ReqStatus.Failed && fetchError) {
      addErrorToast(null, {
        title: FETCH_NOTES_ERROR,
      });
    }
  }, [addErrorToast, fetchError, fetchStatus]);

  // if timeline was saved with a description, we show it at the very top of the notes tab
  const timelineDescription = useMemo(() => {
    if (!timeline?.description) {
      return null;
    }

    return (
      <>
        <EuiComment
          key={'note-preview-description'}
          username={defaultToEmptyTag(timeline.updatedBy)}
          timestamp={
            <>
              {timeline.updated ? (
                <FormattedRelative data-test-subj="updated" value={new Date(timeline.updated)} />
              ) : (
                getEmptyValue()
              )}
            </>
          }
          event={ADDED_A_DESCRIPTION}
          timelineAvatar={<EuiAvatar size="l" name={timeline.updatedBy || '?'} />}
          data-test-subj={TIMELINE_DESCRIPTION_COMMENT_TEST_ID}
        >
          <EuiText size="s">{timeline.description}</EuiText>
        </EuiComment>
        <EuiSpacer />
      </>
    );
  }, [timeline.description, timeline.updated, timeline.updatedBy]);

  return (
    <EuiPanel
      css={css`
        height: 100%;
        overflow: auto;
      `}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>{NOTES}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          {securitySolutionNotesDisabled ? (
            <OldNotes timelineId={timelineId} />
          ) : (
            <EuiFlexGroup data-test-subj={'new-notes-screen'}>
              <EuiFlexItem>
                {timelineDescription}
                {fetchStatus === ReqStatus.Loading && (
                  <EuiLoadingElastic data-test-subj={NOTES_LOADING_TEST_ID} size="xxl" />
                )}
                {isTimelineSaved && fetchStatus === ReqStatus.Succeeded && notes.length === 0 ? (
                  <EuiFlexGroup justifyContent="center">
                    <EuiFlexItem grow={false}>
                      <p>{NO_NOTES}</p>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  <NotesList notes={notes} options={{ hideTimelineIcon: true }} />
                )}
                {canCreateNotes && (
                  <>
                    <EuiSpacer />
                    <AddNote timelineId={timeline.savedObjectId} disableButton={!isTimelineSaved}>
                      {!isTimelineSaved && <SaveTimelineCallout />}
                    </AddNote>
                  </>
                )}
              </EuiFlexItem>
              <EuiFlexItem
                css={css`
                  max-width: 350px;
                `}
              >
                <Participants notes={notes} timelineCreatedBy={timeline.createdBy} />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

NotesTabContentComponent.displayName = 'NotesTabContentComponent';

// eslint-disable-next-line import/no-default-export
export { NotesTabContentComponent as default };
