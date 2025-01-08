/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { CreatedByFilterDropdown } from './created_by_filter_dropdown';
import { ASSOCIATED_NOT_SELECT_TEST_ID, SEARCH_BAR_TEST_ID } from './test_ids';
import { userFilterAssociatedNotes, userSearchedNotes } from '..';
import { AssociatedFilter } from '../../../common/notes/constants';

const ATTACH_FILTER = i18n.translate('xpack.securitySolution.notes.management.attachFilter', {
  defaultMessage: 'Attached to',
});

const searchBox = {
  placeholder: 'Search note contents',
  incremental: false,
  'data-test-subj': SEARCH_BAR_TEST_ID,
};
const associatedNoteSelectOptions: EuiSelectOption[] = [
  { value: AssociatedFilter.all, text: 'Anything or nothing' },
  { value: AssociatedFilter.documentOnly, text: 'Alerts or events only' },
  { value: AssociatedFilter.savedObjectOnly, text: 'Timelines only' },
  {
    value: AssociatedFilter.documentAndSavedObject,
    text: 'Alerts or events and Timelines only',
  },
  { value: AssociatedFilter.orphan, text: 'Nothing' },
];

export const SearchRow = React.memo(() => {
  const dispatch = useDispatch();
  const associatedSelectId = useGeneratedHtmlId({ prefix: 'associatedSelectId' });

  const onQueryChange = useCallback(
    ({ queryText }: { queryText: string }) => {
      dispatch(userSearchedNotes(queryText.trim()));
    },
    [dispatch]
  );

  const onAssociatedNoteSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch(userFilterAssociatedNotes(e.target.value as AssociatedFilter));
    },
    [dispatch]
  );

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <EuiSearchBar box={searchBox} onChange={onQueryChange} defaultQuery="" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CreatedByFilterDropdown />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          id={associatedSelectId}
          options={associatedNoteSelectOptions}
          onChange={onAssociatedNoteSelectChange}
          prepend={ATTACH_FILTER}
          aria-label={ATTACH_FILTER}
          data-test-subj={ASSOCIATED_NOT_SELECT_TEST_ID}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

SearchRow.displayName = 'SearchRow';
