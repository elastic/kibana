/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAvatar,
  EuiComment,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { SaveTimelineCallout } from '../../../notes/save_timeline';
import { AddNote } from '../../../../../notes/components/add_note';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import {
  NOTES_LOADING_TEST_ID,
  TIMELINE_DESCRIPTION_COMMENT_TEST_ID,
} from '../../../../../notes/components/test_ids';
import { ADDED_A_DESCRIPTION } from '../../../open_timeline/note_previews/translations';
import { defaultToEmptyTag, getEmptyValue } from '../../../../../common/components/empty_value';
import { ReqStatus } from '../../../../../notes';
import { NotesList } from '../../../../../notes/components/notes_list';
import { Participants } from '../../../notes/participants';
import { useNotesTabData } from './use_notes_tab_data';

// Local constant — the canonical exported value lives in notes/index.tsx (tests import from there).
const NO_NOTES = i18n.translate('xpack.securitySolution.notes.noNotesLabel', {
  defaultMessage: 'No notes have been created for this Timeline.',
});

interface RegularNotesTabProps {
  timelineId: string;
}

export const RegularNotesTab: React.FC<RegularNotesTabProps> = React.memo(({ timelineId }) => {
  const { notesPrivileges } = useUserPrivileges();
  const canCreateNotes = notesPrivileges.crud;

  const { timeline, notes, fetchStatus, isTimelineSaved } = useNotesTabData(timelineId);

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
  );
});

RegularNotesTab.displayName = 'RegularNotesTab';
