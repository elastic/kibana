/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useFlyoutApi } from '@kbn/flyout';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { useDocumentDetailsContext } from '../../shared/context';
import {
  NOTES_ADD_NOTE_BUTTON_TEST_ID,
  NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID,
  NOTES_COUNT_TEST_ID,
  NOTES_LOADING_TEST_ID,
  NOTES_TITLE_TEST_ID,
  NOTES_VIEW_NOTES_BUTTON_TEST_ID,
} from './test_ids';
import type { State } from '../../../../common/store';
import type { Note } from '../../../../../common/api/timeline';
import {
  fetchNotesByDocumentIds,
  ReqStatus,
  selectFetchNotesByDocumentIdsError,
  selectFetchNotesByDocumentIdsStatus,
  selectNotesByDocumentId,
} from '../../../../notes/store/notes.slice';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { AlertHeaderBlock } from '../../../shared/components/alert_header_block';
import {
  DocumentDetailsNotesPanelKey,
  DocumentDetailsRightPanelKey,
} from '../../shared/constants/panel_keys';

export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.right.notes.fetchNotesErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);
export const ADD_NOTE_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.right.notes.addNoteButtonLabel',
  {
    defaultMessage: 'Add note',
  }
);
export const VIEW_NOTES_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.right.notes.viewNoteButtonAriaLabel',
  {
    defaultMessage: 'View notes',
  }
);

/**
 * Renders a block with the number of notes for the event
 */
export const Notes = memo(() => {
  const { euiTheme } = useEuiTheme();
  const dispatch = useDispatch();
  const { eventId, scopeId, indexName, isRulePreview } = useDocumentDetailsContext();
  const { addError: addErrorToast } = useAppToasts();
  const { notesPrivileges } = useUserPrivileges();

  const { openFlyout } = useFlyoutApi();
  const openNotesFlyout = useCallback(
    () =>
      openFlyout(
        {
          main: {
            id: DocumentDetailsNotesPanelKey,
            params: {
              id: eventId,
              indexName,
              scopeId,
              isChild: false,
            },
          },
          child: {
            id: DocumentDetailsRightPanelKey,
            params: {
              id: eventId,
              indexName,
              scopeId,
              isChild: true,
            },
          },
        },
        { mainSize: 'm' }
      ),
    [eventId, indexName, openFlyout, scopeId]
  );

  const cannotAddNotes = isRulePreview || !notesPrivileges.crud;
  const cannotReadNotes = isRulePreview || !notesPrivileges.read;

  useEffect(() => {
    // fetch notes only if we are not in a preview panel, or not in a rule preview workflow, and if the user has the correct privileges
    if (!cannotReadNotes) {
      dispatch(fetchNotesByDocumentIds({ documentIds: [eventId] }));
    }
  }, [dispatch, eventId, cannotReadNotes]);

  const fetchStatus = useSelector((state: State) => selectFetchNotesByDocumentIdsStatus(state));
  const fetchError = useSelector((state: State) => selectFetchNotesByDocumentIdsError(state));

  const notes: Note[] = useSelector((state: State) => selectNotesByDocumentId(state, eventId));

  // show a toast if the fetch notes call fails
  useEffect(() => {
    if (fetchStatus === ReqStatus.Failed && fetchError) {
      addErrorToast(null, {
        title: FETCH_NOTES_ERROR,
      });
    }
  }, [addErrorToast, fetchError, fetchStatus]);

  const viewNotesButton = useMemo(
    () => (
      <EuiButtonEmpty
        onClick={openNotesFlyout}
        size="s"
        disabled={cannotReadNotes}
        aria-label={VIEW_NOTES_BUTTON_ARIA_LABEL}
        data-test-subj={NOTES_VIEW_NOTES_BUTTON_TEST_ID}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.notes.viewNoteButtonLabel"
          defaultMessage="View {count, plural, one {note} other {notes}}"
          values={{ count: notes.length }}
        />
      </EuiButtonEmpty>
    ),
    [cannotReadNotes, notes.length, openNotesFlyout]
  );
  const addNoteButton = useMemo(
    () => (
      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={openNotesFlyout}
        size="s"
        disabled={cannotAddNotes}
        aria-label={ADD_NOTE_BUTTON}
        data-test-subj={NOTES_ADD_NOTE_BUTTON_TEST_ID}
      >
        {ADD_NOTE_BUTTON}
      </EuiButtonEmpty>
    ),
    [cannotAddNotes, openNotesFlyout]
  );
  const addNoteButtonIcon = useMemo(
    () => (
      <EuiButtonIcon
        onClick={openNotesFlyout}
        iconType="plusInCircle"
        disabled={cannotAddNotes}
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
        aria-label={ADD_NOTE_BUTTON}
        data-test-subj={NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID}
      />
    ),
    [euiTheme.size.xs, cannotAddNotes, openNotesFlyout]
  );

  return (
    <AlertHeaderBlock
      hasBorder
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.header.notesTitle"
          defaultMessage="Notes"
        />
      }
      data-test-subj={NOTES_TITLE_TEST_ID}
    >
      {isRulePreview ? (
        getEmptyTagValue()
      ) : (
        <>
          {fetchStatus === ReqStatus.Loading ? (
            <EuiLoadingSpinner data-test-subj={NOTES_LOADING_TEST_ID} size="m" />
          ) : (
            <>
              {notes.length === 0 ? (
                <>{notesPrivileges.crud ? addNoteButton : getEmptyTagValue()}</>
              ) : (
                <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
                  <EuiFlexItem data-test-subj={NOTES_COUNT_TEST_ID}>
                    <FormattedCount count={notes.length} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {notesPrivileges.crud ? addNoteButtonIcon : viewNotesButton}
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </>
          )}
        </>
      )}
    </AlertHeaderBlock>
  );
});

Notes.displayName = 'Notes';
