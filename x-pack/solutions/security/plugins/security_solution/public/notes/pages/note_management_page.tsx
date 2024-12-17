/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAvatar,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { css } from '@emotion/react';
import { DeleteNoteButtonIcon } from '../components/delete_note_button';
import { Title } from '../../common/components/header_page/title';
// TODO unify this type from the api with the one in public/common/lib/note
import type { Note } from '../../../common/api/timeline';
import { FormattedRelativePreferenceDate } from '../../common/components/formatted_date';
import {
  userSelectedPage,
  userSelectedPerPage,
  userSelectedRow,
  userSortedNotes,
  selectAllNotes,
  selectNotesPagination,
  selectNotesTableSort,
  fetchNotes,
  selectNotesTableSearch,
  selectFetchNotesStatus,
  selectNotesTablePendingDeleteIds,
  selectFetchNotesError,
  ReqStatus,
  selectNotesTableCreatedByFilter,
  selectNotesTableAssociatedFilter,
} from '..';
import type { NotesState } from '..';
import { SearchRow } from '../components/search_row';
import { NotesUtilityBar } from '../components/utility_bar';
import { DeleteConfirmModal } from '../components/delete_confirm_modal';
import * as i18n from './translations';
import { OpenFlyoutButtonIcon } from '../components/open_flyout_button';
import { OpenTimelineButtonIcon } from '../components/open_timeline_button';
import { NoteContent } from '../components/note_content';

const columns: Array<EuiBasicTableColumn<Note>> = [
  {
    name: i18n.ACTIONS_COLUMN,
    render: (note: Note) => (
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 24px;
          `}
        >
          {note.eventId ? (
            <OpenFlyoutButtonIcon
              eventId={note.eventId}
              timelineId={note.timelineId}
              iconType="expand"
            />
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 24px;
          `}
        >
          <>{note.timelineId ? <OpenTimelineButtonIcon note={note} /> : null}</>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 24px;
          `}
        >
          <DeleteNoteButtonIcon note={note} index={0} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    width: '72px',
  },
  {
    field: 'createdBy',
    name: i18n.CREATED_BY_COLUMN,
    render: (createdBy: Note['createdBy']) => <EuiAvatar name={createdBy || ''} size="s" />,
    width: '100px',
    align: 'center',
  },
  {
    field: 'note',
    name: i18n.NOTE_CONTENT_COLUMN,
    render: (note: Note['note']) => <>{note && <NoteContent note={note} />}</>,
  },
  {
    field: 'created',
    name: i18n.CREATED_COLUMN,
    sortable: true,
    render: (created: Note['created']) => <FormattedRelativePreferenceDate value={created} />,
    width: '225px',
  },
];

const pageSizeOptions = [10, 25, 50, 100];

/**
 * Allows user to search and delete notes.
 * This component uses the same slices of state as the notes functionality of the rest of the Security Solution applicaiton.
 * Therefore, changes made in this page (like fetching or deleting notes) will have an impact everywhere.
 */
export const NoteManagementPage = () => {
  const dispatch = useDispatch();
  const notes = useSelector(selectAllNotes);
  const pagination = useSelector(selectNotesPagination);
  const sort = useSelector(selectNotesTableSort);
  const notesSearch = useSelector(selectNotesTableSearch);
  const notesCreatedByFilter = useSelector(selectNotesTableCreatedByFilter);
  const notesAssociatedFilter = useSelector(selectNotesTableAssociatedFilter);
  const pendingDeleteIds = useSelector(selectNotesTablePendingDeleteIds);
  const isDeleteModalVisible = pendingDeleteIds.length > 0;
  const fetchNotesStatus = useSelector(selectFetchNotesStatus);
  const fetchLoading = fetchNotesStatus === ReqStatus.Loading;
  const fetchError = fetchNotesStatus === ReqStatus.Failed;
  const fetchErrorData = useSelector(selectFetchNotesError);

  const fetchData = useCallback(() => {
    dispatch(
      fetchNotes({
        page: pagination.page,
        perPage: pagination.perPage,
        sortField: sort.field,
        sortOrder: sort.direction,
        filter: '',
        createdByFilter: notesCreatedByFilter,
        associatedFilter: notesAssociatedFilter,
        search: notesSearch,
      })
    );
  }, [
    dispatch,
    pagination.page,
    pagination.perPage,
    sort.field,
    sort.direction,
    notesCreatedByFilter,
    notesAssociatedFilter,
    notesSearch,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onTableChange = useCallback(
    ({
      page,
      sort: newSort,
    }: {
      page?: { index: number; size: number };
      sort?: NotesState['sort'];
    }) => {
      if (page) {
        dispatch(userSelectedPage(page.index + 1));
        dispatch(userSelectedPerPage(page.size));
      }
      if (newSort) {
        dispatch(userSortedNotes({ field: newSort.field, direction: newSort.direction }));
      }
    },
    [dispatch]
  );

  const onSelectionChange = useCallback(
    (selection: Note[]) => {
      const rowIds = selection.map((item) => item.noteId);
      dispatch(userSelectedRow(rowIds));
    },
    [dispatch]
  );

  const itemIdSelector = useCallback((item: Note) => {
    return item.noteId;
  }, []);

  const currentPagination = useMemo(() => {
    return {
      pageIndex: pagination.page - 1,
      pageSize: pagination.perPage,
      totalItemCount: pagination.total,
      pageSizeOptions,
    };
  }, [pagination]);

  const selection = useMemo(() => {
    return {
      onSelectionChange,
      selectable: () => true,
    };
  }, [onSelectionChange]);

  const sorting: { sort: { field: keyof Note; direction: 'asc' | 'desc' } } = useMemo(() => {
    return {
      sort,
    };
  }, [sort]);

  if (fetchError) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{i18n.TABLE_ERROR}</h2>}
        body={<p>{fetchErrorData as React.ReactNode}</p>}
      />
    );
  }

  return (
    <>
      <Title title={i18n.NOTES} />
      <EuiSpacer size="m" />
      <SearchRow />
      <EuiSpacer size="m" />
      <NotesUtilityBar />
      <EuiBasicTable
        items={notes}
        pagination={currentPagination}
        columns={columns}
        onChange={onTableChange}
        selection={selection}
        sorting={sorting}
        itemId={itemIdSelector}
        loading={fetchLoading}
      />
      {isDeleteModalVisible && <DeleteConfirmModal />}
    </>
  );
};

NoteManagementPage.displayName = 'NoteManagementPage';
