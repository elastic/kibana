/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import { css } from '@emotion/react';
import { EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import type { CspClientPluginStartDeps } from '@kbn/cloud-security-posture';
import {
  CDR_VULNERABILITIES_INDEX_PATTERN,
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-common';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useDataViewContext } from '../../../common/contexts/data_view_context';
import { SecuritySolutionContext } from '../../../application/security_solution_context';
import type { FindingsBaseURLQuery } from '../../../common/types';
import { PLUGIN_NAME } from '../../../../common';

type SearchBarQueryProps = Pick<FindingsBaseURLQuery, 'query' | 'filters'>;

interface FindingsSearchBarProps {
  setQuery(v: Partial<SearchBarQueryProps>): void;
  loading: boolean;
  placeholder?: string;
  query: SearchBarQueryProps;
}

export const FindingsSearchBar = ({
  loading,
  query,
  setQuery,
  placeholder = i18n.translate('xpack.csp.findings.searchBar.searchPlaceholder', {
    defaultMessage: 'Search findings (eg. rule.section : "API Server" )',
  }),
}: FindingsSearchBarProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<CspClientPluginStartDeps>().services;

  const securitySolutionContext = useContext(SecuritySolutionContext);

  const { dataView } = useDataViewContext();

  const queryClient = useQueryClient();

  const misconfigurationRefreshQueryKey = [CDR_MISCONFIGURATIONS_INDEX_PATTERN];

  const vulnerabilityRefreshQueryKey = [CDR_VULNERABILITIES_INDEX_PATTERN];

  const refreshQueryKey =
    dataView.id === 'security_solution_cdr_latest_vulnerabilities-default'
      ? vulnerabilityRefreshQueryKey
      : misconfigurationRefreshQueryKey;
  const isFetchingData = useIsFetching({
    queryKey: refreshQueryKey,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: refreshQueryKey,
    });
  };

  let searchBarNode = (
    <div css={getContainerStyle(euiTheme)}>
      <SearchBar
        appName={PLUGIN_NAME}
        showFilterBar={true}
        showQueryInput={true}
        showDatePicker={false}
        isLoading={loading || isFetchingData > 0}
        indexPatterns={[dataView]}
        onQuerySubmit={(payload, isUpdated) => {
          if (isUpdated) setQuery(payload);
          if (!isUpdated) {
            handleRefresh();
          }
        }}
        onFiltersUpdated={(value: Filter[]) => setQuery({ filters: value })}
        placeholder={placeholder}
        query={{
          query: query?.query?.query || '',
          language: query?.query?.language || 'kuery',
        }}
        filters={query?.filters || []}
      />
    </div>
  );

  if (securitySolutionContext) {
    const FiltersGlobal = securitySolutionContext.getFiltersGlobalComponent();
    searchBarNode = <FiltersGlobal>{searchBarNode}</FiltersGlobal>;
  }

  return <>{searchBarNode}</>;
};

const getContainerStyle = (theme: EuiThemeComputed) => css`
  border-bottom: ${theme.border.thin};
  background-color: ${theme.colors.body};
  padding: ${theme.size.base};
`;
