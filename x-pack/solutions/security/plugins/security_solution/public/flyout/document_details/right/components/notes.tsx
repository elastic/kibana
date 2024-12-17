/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';
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
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { useDocumentDetailsContext } from '../../shared/context';
import {
  NOTES_ADD_NOTE_BUTTON_TEST_ID,
  NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID,
  NOTES_COUNT_TEST_ID,
  NOTES_LOADING_TEST_ID,
  NOTES_TITLE_TEST_ID,
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
import { AlertHeaderBlock } from './alert_header_block';
import { LeftPanelNotesTab } from '../../left';

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

/**
 * Renders a block with the number of notes for the event
 */
export const Notes = memo(() => {
  const { euiTheme } = useEuiTheme();
  const dispatch = useDispatch();
  const { eventId, indexName, scopeId, isPreview, isPreviewMode } = useDocumentDetailsContext();
  const { addError: addErrorToast } = useAppToasts();

  const { openLeftPanel } = useExpandableFlyoutApi();
  const openExpandedFlyoutNotesTab = useCallback(
    () =>
      openLeftPanel({
        id: DocumentDetailsLeftPanelKey,
        path: { tab: LeftPanelNotesTab },
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      }),
    [eventId, indexName, openLeftPanel, scopeId]
  );

  useEffect(() => {
    // only fetch notes if we are not in a preview panel, or not in a rule preview workflow
    if (!isPreviewMode && !isPreview) {
      dispatch(fetchNotesByDocumentIds({ documentIds: [eventId] }));
    }
  }, [dispatch, eventId, isPreview, isPreviewMode]);

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

  return (
    <AlertHeaderBlock
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.header.notesTitle"
          defaultMessage="Notes"
        />
      }
      data-test-subj={NOTES_TITLE_TEST_ID}
    >
      {isPreview ? (
        getEmptyTagValue()
      ) : (
        <>
          {fetchStatus === ReqStatus.Loading ? (
            <EuiLoadingSpinner data-test-subj={NOTES_LOADING_TEST_ID} size="m" />
          ) : (
            <>
              {notes.length === 0 ? (
                <EuiButtonEmpty
                  iconType="plusInCircle"
                  onClick={openExpandedFlyoutNotesTab}
                  size="s"
                  disabled={isPreviewMode || isPreview}
                  aria-label={ADD_NOTE_BUTTON}
                  data-test-subj={NOTES_ADD_NOTE_BUTTON_TEST_ID}
                >
                  {ADD_NOTE_BUTTON}
                </EuiButtonEmpty>
              ) : (
                <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
                  <EuiFlexItem data-test-subj={NOTES_COUNT_TEST_ID}>
                    <FormattedCount count={notes.length} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButtonIcon
                      onClick={openExpandedFlyoutNotesTab}
                      iconType="plusInCircle"
                      disabled={isPreviewMode || isPreview}
                      css={css`
                        margin-left: ${euiTheme.size.xs};
                      `}
                      aria-label={ADD_NOTE_BUTTON}
                      data-test-subj={NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID}
                    />
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
