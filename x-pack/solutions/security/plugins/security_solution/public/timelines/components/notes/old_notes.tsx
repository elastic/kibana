/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, uniqBy } from 'lodash/fp';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import type { EuiTheme } from '@kbn/react-kibana-context-styled';
import { timelineActions } from '../../store';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { TimelineStatusEnum } from '../../../../common/api/timeline';
import { appSelectors } from '../../../common/store/app';
import { AddNote } from './add_note';
import { CREATED_BY } from './translations';
import { PARTICIPANTS } from '../timeline/translations';
import { NotePreviews } from '../open_timeline/note_previews';
import type { TimelineResultNote } from '../open_timeline/types';
import { getTimelineNoteSelector } from '../timeline/tabs/notes/selectors';
import { getScrollToTopSelector } from '../timeline/tabs/selectors';
import { useScrollToTop } from '../../../common/components/scroll_to_top';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { FullWidthFlexGroup, VerticalRule } from '../timeline/tabs/shared/layout';

const ScrollableDiv = styled.div`
  overflow-x: hidden;
  overflow-y: auto;
  padding-inline: ${({ theme }) => (theme as EuiTheme).eui.euiSizeM};
  padding-block: ${({ theme }) => (theme as EuiTheme).eui.euiSizeS};
`;

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  flex: 0;
`;

const Username = styled(EuiText)`
  font-weight: bold;
`;

interface UsernameWithAvatar {
  username: string;
}

const UsernameWithAvatarComponent: React.FC<UsernameWithAvatar> = ({ username }) => (
  <StyledEuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiAvatar data-test-subj="avatar" name={username} size="l" />
    </EuiFlexItem>
    <EuiFlexItem>
      <Username>{username}</Username>
    </EuiFlexItem>
  </StyledEuiFlexGroup>
);

const UsernameWithAvatar = React.memo(UsernameWithAvatarComponent);

interface ParticipantsProps {
  users: TimelineResultNote[];
}

export const ParticipantsComponent: React.FC<ParticipantsProps> = ({ users }) => {
  const List = useMemo(
    () =>
      users.map((user) => (
        <Fragment key={user.updatedBy === null ? undefined : user.updatedBy}>
          <UsernameWithAvatar
            key={user.updatedBy === null ? undefined : user.updatedBy}
            username={String(user.updatedBy)}
          />
          <EuiSpacer size="s" />
        </Fragment>
      )),
    [users]
  );

  if (!users.length) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xs">
        <h4>{PARTICIPANTS}</h4>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      {List}
    </>
  );
};

ParticipantsComponent.displayName = 'ParticipantsComponent';

const Participants = React.memo(ParticipantsComponent);

interface NotesTabContentProps {
  timelineId: string;
}

/**
 * Renders the "old" notes tab content. This should be removed when we remove the securitySolutionNotesDisabled feature flag
 */
export const OldNotes: React.FC<NotesTabContentProps> = React.memo(({ timelineId }) => {
  const dispatch = useDispatch();
  const { kibanaSecuritySolutionsPrivileges } = useUserPrivileges();

  const getScrollToTop = useMemo(() => getScrollToTopSelector(), []);
  const scrollToTop = useShallowEqualSelector((state) => getScrollToTop(state, timelineId));

  useScrollToTop('#scrollableNotes', !!scrollToTop);

  const getTimelineNotes = useMemo(() => getTimelineNoteSelector(), []);
  const {
    createdBy,
    eventIdToNoteIds,
    noteIds,
    status: timelineStatus,
  } = useDeepEqualSelector((state) => getTimelineNotes(state, timelineId));
  const getNotesAsCommentsList = useMemo(
    () => appSelectors.selectNotesAsCommentsListSelector(),
    []
  );
  const [newNote, setNewNote] = useState('');
  const isImmutable = timelineStatus === TimelineStatusEnum.immutable;
  const appNotes: TimelineResultNote[] = useDeepEqualSelector(getNotesAsCommentsList);

  const allTimelineNoteIds = useMemo(() => {
    const eventNoteIds = Object.values(eventIdToNoteIds).reduce<string[]>(
      (acc, v) => [...acc, ...v],
      []
    );
    return [...noteIds, ...eventNoteIds];
  }, [noteIds, eventIdToNoteIds]);

  const notes = useMemo(
    () => appNotes.filter((appNote) => allTimelineNoteIds.includes(appNote?.noteId ?? '-1')),
    [appNotes, allTimelineNoteIds]
  );

  // filter for savedObjectId to make sure we don't display `elastic` user while saving the note
  const participants = useMemo(() => uniqBy('updatedBy', filter('savedObjectId', notes)), [notes]);

  const associateNote = useCallback(
    (noteId: string) => dispatch(timelineActions.addNote({ id: timelineId, noteId })),
    [dispatch, timelineId]
  );

  const SidebarContent = useMemo(
    () => (
      <>
        {createdBy && (
          <>
            <EuiTitle size="xs">
              <h4>{CREATED_BY}</h4>
            </EuiTitle>
            <EuiHorizontalRule margin="s" />
            <UsernameWithAvatar username={createdBy} />
            <EuiSpacer size="xxl" />
          </>
        )}
        <Participants users={participants} />
      </>
    ),
    [createdBy, participants]
  );

  return (
    <FullWidthFlexGroup gutterSize="none" data-test-subj={'old-notes-screen'}>
      <EuiFlexItem component={ScrollableDiv} grow={2} id="scrollableNotes">
        <NotePreviews notes={notes} timelineId={timelineId} showTimelineDescription />
        <EuiSpacer size="s" />
        {!isImmutable && kibanaSecuritySolutionsPrivileges.crud === true && (
          <AddNote
            associateNote={associateNote}
            newNote={newNote}
            updateNewNote={setNewNote}
            autoFocusDisabled={!!scrollToTop}
          />
        )}
      </EuiFlexItem>
      <VerticalRule />
      <EuiFlexItem component={ScrollableDiv} grow={1}>
        {SidebarContent}
      </EuiFlexItem>
    </FullWidthFlexGroup>
  );
});

OldNotes.displayName = 'OldNotes';
