/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { ScriptLibraryFilter } from './script_library_filter';
import { ScriptLibrarySearchTermFilter } from './script_library_search_term_filter';

interface ScriptLibraryFilterProps {
  onChangePlatformFilter: (selectedItems: string[]) => void;
  onChangeFileTypeFilter: (selectedItems: string[]) => void;
  onChangeTagsFilter: (selectedItems: string[]) => void;
  onChangeSearchTermsFilter: (searchTerms: string[]) => void;
  'data-test-subj'?: string;
}

export const ScriptLibraryFilters = memo<ScriptLibraryFilterProps>(
  ({
    onChangePlatformFilter,
    onChangeFileTypeFilter,
    onChangeTagsFilter,
    onChangeSearchTermsFilter,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    return (
      <>
        <EuiFlexGroup gutterSize="s" responsive data-test-subj={getTestId('filters')}>
          <EuiFlexItem grow={1}>
            <ScriptLibrarySearchTermFilter
              onChangeSearch={onChangeSearchTermsFilter}
              data-test-subj={getTestId('search-term-filter')}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <ScriptLibraryFilter
                onChangeFilter={onChangeFileTypeFilter}
                filterName="fileType"
                data-test-subj={getTestId('file-type-filter')}
              />
              <ScriptLibraryFilter
                onChangeFilter={onChangePlatformFilter}
                filterName="platform"
                data-test-subj={getTestId('platform-filter')}
              />
              <ScriptLibraryFilter
                onChangeFilter={onChangeTagsFilter}
                filterName="tags"
                data-test-subj={getTestId('tags-filter')}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
      </>
    );
  }
);

ScriptLibraryFilters.displayName = 'ScriptLibraryFilters';
