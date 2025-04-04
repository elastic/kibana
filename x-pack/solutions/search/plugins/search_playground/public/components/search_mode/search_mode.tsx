/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiImage,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { Controller, useController, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PAGINATION } from '../../../common';
import { ResultList } from './result_list';
import { ChatForm, ChatFormFields, Pagination } from '../../types';
import { useSearchPreview } from '../../hooks/use_search_preview';
import { getPaginationFromPage } from '../../utils/pagination_helper';
import { useIndexMappings } from '../../hooks/use_index_mappings';
import heroImage from '../../assets/hero_image.svg';

export const SearchMode: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { control } = useFormContext<ChatForm>();
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

  const { executionTime, results, pagination } = useSearchPreview(searchQuery);
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
    <KibanaPageTemplate.Section
      alignment="top"
      restrictWidth
      grow
      css={{
        position: 'relative',
      }}
      paddingSize="xl"
      className="eui-fullHeight"
      data-test-subj="playground-search-section"
    >
      <EuiFlexGroup direction="row" justifyContent="center">
        <EuiFlexItem
          grow
          css={css`
            max-width: ${euiTheme.base * 48}px;
          `}
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiForm
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <Controller
                  control={control}
                  name={ChatFormFields.searchQuery}
                  render={({ field }) => (
                    <EuiFieldSearch
                      data-test-subj="searchPlaygroundSearchModeFieldText"
                      {...field}
                      value={searchBarValue}
                      fullWidth
                      placeholder={i18n.translate(
                        'xpack.searchPlayground.searchMode.searchBar.placeholder',
                        { defaultMessage: 'Search for documents' }
                      )}
                      isLoading={isSubmitting}
                      isClearable
                      incremental
                      onSearch={handleSearch}
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
                      executionTime={executionTime}
                      searchResults={results}
                      mappings={mappingData}
                      pagination={pagination}
                      onPaginationChange={onPagination}
                    />
                  ) : (
                    <EuiEmptyPrompt
                      icon={
                        <EuiImage
                          size="fullWidth"
                          src={heroImage}
                          alt={i18n.translate('xpack.searchPlayground.searchMode.readyToSearch', {
                            defaultMessage: 'Hero image icon',
                          })}
                        />
                      }
                      title={
                        <h2>
                          {i18n.translate('xpack.searchPlayground.searchMode.readyToSearch', {
                            defaultMessage: 'We are ready to search!',
                          })}
                        </h2>
                      }
                      body={
                        <p>
                          {i18n.translate('xpack.searchPlayground.searchMode.searchPrompt', {
                            defaultMessage:
                              'Fine tune a traditional search with your data. Start by entering a query above to see what results you get and go from there!',
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
    </KibanaPageTemplate.Section>
  );
};
