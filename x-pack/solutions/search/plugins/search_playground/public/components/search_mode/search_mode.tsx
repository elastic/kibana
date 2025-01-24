/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Controller, useController, useFormContext } from 'react-hook-form';

import { css } from '@emotion/react';

import { useQueryClient } from '@tanstack/react-query';

import {
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DEFAULT_PAGINATION } from '../../../common';

import { useIndexMappings } from '../../hooks/use_index_mappings';
import { useSearchPreview } from '../../hooks/use_search_preview';
import { ChatForm, ChatFormFields, Pagination } from '../../types';
import { getPaginationFromPage } from '../../utils/pagination_helper';

import { ResultList } from './result_list';

export const SearchMode: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { control, handleSubmit } = useFormContext();
  const {
    field: { value: searchBarValue },
    formState: { isSubmitting },
  } = useController<ChatForm, ChatFormFields.searchQuery>({
    name: ChatFormFields.searchQuery,
  });

  const [searchQuery, setSearchQuery] = React.useState<{
    query: string;
    pagination: Pagination;
  }>({ query: searchBarValue, pagination: DEFAULT_PAGINATION });

  const { results, pagination } = useSearchPreview(searchQuery);
  const { data: mappingData } = useIndexMappings();

  const queryClient = useQueryClient();
  const handleSearch = async (query = searchBarValue, paginationParam = DEFAULT_PAGINATION) => {
    queryClient.resetQueries({ queryKey: ['search-preview-results'] });
    setSearchQuery({ query, pagination: paginationParam });
  };

  const onPagination = (page: number) => {
    handleSearch(searchBarValue, getPaginationFromPage(page, pagination.size, pagination));
  };

  return (
    <EuiFlexGroup direction="row" justifyContent="center">
      <EuiFlexItem
        grow
        css={css`
          max-width: ${euiTheme.base * 48}px;
        `}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiForm component="form" onSubmit={handleSubmit(() => handleSearch())}>
              <Controller
                control={control}
                name={ChatFormFields.searchQuery}
                render={({ field }) => (
                  <EuiFieldText
                    data-test-subj="searchPlaygroundSearchModeFieldText"
                    {...field}
                    value={searchBarValue}
                    icon="search"
                    fullWidth
                    placeholder={i18n.translate(
                      'xpack.searchPlayground.searchMode.searchBar.placeholder',
                      { defaultMessage: 'Search for documents' }
                    )}
                    isLoading={isSubmitting}
                  />
                )}
              />
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                {searchQuery.query ? (
                  <ResultList
                    searchResults={results}
                    mappings={mappingData}
                    pagination={pagination}
                    onPaginationChange={onPagination}
                  />
                ) : (
                  <EuiEmptyPrompt
                    iconType={'checkInCircleFilled'}
                    iconColor="success"
                    title={
                      <h2>
                        {i18n.translate('xpack.searchPlayground.searchMode.readyToSearch', {
                          defaultMessage: 'Ready to search',
                        })}
                      </h2>
                    }
                    body={
                      <p>
                        {i18n.translate('xpack.searchPlayground.searchMode.searchPrompt', {
                          defaultMessage:
                            'Type in a query in the search bar above or view the query we automatically created for you.',
                        })}
                      </p>
                    }
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
