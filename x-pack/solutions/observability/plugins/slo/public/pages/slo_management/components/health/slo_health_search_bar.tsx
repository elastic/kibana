/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { ControlGroupRenderer, ControlGroupRendererApi } from '@kbn/controls-plugin/public';
import { Filter } from '@kbn/es-query';
import { observabilityAppId } from '@kbn/observability-plugin/public';
import { isEmpty } from 'lodash';
import React, { useEffect, useState } from 'react';
import { skip } from 'rxjs';
import { HEALTH_INDEX_PATTERN } from '../../../../../common/constants';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { useKibana } from '../../../../hooks/use_kibana';

interface Props {
  query?: string;
  filters?: Filter[];
  statusFilter?: Filter;
  onSearchChange: ({
    newQuery,
    newFilters,
    newStatusFilter,
  }: {
    newQuery: string;
    newFilters: Filter[];
    newStatusFilter?: Filter;
  }) => void;
}

export function SloHealthSearchBar({
  query = '',
  filters = [],
  statusFilter,
  onSearchChange,
}: Props) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;
  const [controlGroupAPI, setControlGroupAPI] = useState<ControlGroupRendererApi | undefined>();
  const { loading: isDataViewLoading, dataView } = useCreateDataView({
    indexPatternString: HEALTH_INDEX_PATTERN,
  });

  useEffect(() => {
    if (!controlGroupAPI) {
      return;
    }
    const subscription = controlGroupAPI.filters$.pipe(skip(1)).subscribe((newFilters = []) => {
      const newStatusFilter = newFilters.find((filter) => filter.meta.key === 'status');
      onSearchChange({ newQuery: query, newFilters: filters, newStatusFilter });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupAPI, onSearchChange, query, filters, statusFilter]);

  return (
    <div
      css={css`
        .uniSearchBar {
          padding: 0;
        }
      `}
    >
      <SearchBar
        appName={observabilityAppId}
        placeholder="Search your SLOs"
        indexPatterns={dataView ? [dataView] : []}
        isDisabled={isDataViewLoading}
        query={{ query: String(query), language: 'kuery' }}
        onQuerySubmit={({ query: newQuery }) => {
          onSearchChange({
            newQuery: String(newQuery?.query),
            newFilters: filters,
            newStatusFilter: statusFilter,
          });
        }}
        filters={filters}
        onFiltersUpdated={(newFilters) => {
          onSearchChange({ newQuery: query, newFilters, newStatusFilter: statusFilter });
        }}
        showSubmitButton={true}
        showDatePicker={false}
        showQueryInput={true}
        disableQueryLanguageSwitcher={true}
        allowSavingQueries
        onClearSavedQuery={() => {}}
        renderQueryInputAppend={() =>
          dataView && (
            <div
              css={css`
                .controlsWrapper {
                  align-items: flex-start;
                  min-height: initial;
                }
                .controlPanel {
                  height: initial;
                }
                .controlGroup {
                  min-height: initial;
                }
              `}
            >
              <ControlGroupRenderer
                onApiAvailable={setControlGroupAPI}
                getCreationOptions={async (initialState, builder) => {
                  builder.addOptionsListControl(
                    initialState,
                    {
                      dataViewId: dataView.id!,
                      fieldName: 'status',
                      hideExclude: true,
                      hideSort: true,
                      hideExists: true,
                      hideActionBar: true,
                      width: 'small',
                      grow: false,
                      title: 'Status',
                      selectedOptions: getSelectedOptions(statusFilter),
                      existsSelected: Boolean(
                        filters?.some((filter) => filter.meta.key === 'status')
                      ),
                      placeholder: 'All',
                    },
                    'health-status'
                  );

                  return {
                    initialState,
                  };
                }}
                timeRange={{ from: 'now-24h', to: 'now' }}
                compressed={false}
              />
            </div>
          )
        }
        onSavedQueryUpdated={(savedQuery) => {
          onSearchChange({
            newQuery: String(savedQuery.attributes.query.query),
            newFilters: savedQuery.attributes.filters ?? [],
            newStatusFilter: statusFilter,
          });
        }}
      />
    </div>
  );
}

const getSelectedOptions = (filter?: Filter) => {
  if (isEmpty(filter)) {
    return [];
  }
  if (filter?.meta?.params && Array.isArray(filter?.meta.params)) {
    return filter?.meta.params;
  }
  if (filter?.query?.match_phrase?.status) {
    return [filter.query.match_phrase.status];
  }
  return [];
};
