/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiLink,
  EuiBadge,
  EuiText,
  EuiFieldSearch,
  EuiSpacer,
  EuiTitle,
  EuiSkeletonText,
  EuiComboBox,
} from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import type {
  ThreatHuntingQueryIndexStatus,
  ThreatHuntingQueryWithIndexCheck,
} from '../../../common/api/entity_analytics/threat_hunting/common.gen';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useListThreatHuntingQueries } from '../api/hooks/use_list_threat_hunting_queries';
import { useOpenThreatHuntingQueryInDiscover } from '../hooks/use_open_threat_hunting_query_in_discover';

const CATEGORY_COLOUR_MAP: Record<string, string> = {
  windows: '#a7d0f4',
  linux: '#ffebc0',
  macos: '#c1ecea',
  llm: '#f4d0cf',
  azure: '#d7c8f2',
  okta: '#c0e8e5',
  aws: '#fbd0e6',
};

const IndexStatusBadge: React.FC<{ status?: ThreatHuntingQueryIndexStatus }> = ({ status }) => {
  return (
    <EuiBadge
      color={
        status === 'all'
          ? 'success'
          : status === 'some'
          ? 'warning'
          : status === 'none'
          ? 'danger'
          : 'ghost'
      }
      iconType={status === 'all' ? 'check' : status === 'some' ? 'warning' : 'cross'}
      iconSide="left"
    >
      {status === 'all'
        ? 'All indices available'
        : status === 'some'
        ? 'Some indices available'
        : status === 'none'
        ? 'No indices available'
        : 'Unknown'}
    </EuiBadge>
  );
};

const CategoryBadge: React.FC<{ category?: string }> = ({ category }) => {
  if (!category) {
    return <EuiBadge color="hollow">{'misc'}</EuiBadge>;
  }

  return <EuiBadge color={CATEGORY_COLOUR_MAP[category] || 'hollow'}>{category}</EuiBadge>;
};

const toShortenedDescription = (description: string) => {
  // everything up up to the first period or 100 characters
  const periodIndex = description.indexOf('.');
  if (periodIndex !== -1) {
    return description.substring(0, periodIndex + 1);
  }
  return description.length > 100 ? `${description.substring(0, 100)}...` : description;
};

const QueryPanel: React.FC<{ query: ThreatHuntingQueryWithIndexCheck }> = ({ query }) => {
  const { name, description, indexStatus, category } = query;
  const discoverLogsLink = useOpenThreatHuntingQueryInDiscover(query.queries[0]);

  const shortenedDescription = toShortenedDescription(description);
  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>{name}</h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <CategoryBadge category={category} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge iconType="search" color="primary">{`ES|QL`}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <IndexStatusBadge status={indexStatus} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconType="search">
                {`${query.queries.length} ${query.queries.length === 1 ? 'query' : 'queries'}`}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={{ minHeight: 60 }}>
          <EuiText size="s" color="subdued">
            {shortenedDescription}
          </EuiText>
        </EuiFlexItem>

        {query.queries.length === 1 && discoverLogsLink && (
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiLink href={discoverLogsLink} target="_blank">
                  {'Open in Discover'}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const indexStatusOptions = [
  { label: 'all', color: 'success' },
  { label: 'some', color: 'warning' },
  { label: 'none', color: 'danger' },
];

const categoryOptions = Object.keys(CATEGORY_COLOUR_MAP).map((category) => ({
  label: category,
  color: CATEGORY_COLOUR_MAP[category],
}));

interface SearchState {
  q: string;
  categories: string[];
  indexStatuses: ThreatHuntingQueryIndexStatus[];
}

const SearchBar = ({ onSearch }: { onSearch: (searchState: SearchState) => void }) => {
  const [searchState, setSearchState] = useState({
    q: '',
    categories: [] as string[],
    indexStatuses: [] as string[],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFilterChange = (field: keyof typeof searchState, value: any) => {
    const updatedFilters = { ...searchState, [field]: value } as SearchState;
    setSearchState(updatedFilters);
    onSearch(updatedFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('q', e.target.value);
  };

  const handleCategoryChange = (selectedOptions: Array<{ value: string }>) => {
    handleFilterChange(
      'categories',
      selectedOptions.map((option) => option.value)
    );
  };

  const handleIndexStatusChange = (selectedOptions: Array<{ value: string }>) => {
    handleFilterChange(
      'indexStatuses',
      selectedOptions.map((option) => option.value)
    );
  };

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={4}>
          <EuiFieldSearch
            css={{ minWidth: 500 }}
            placeholder="Search threat hunting queries..."
            value={searchState.q}
            onChange={handleSearchChange}
            aria-label="Search"
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiComboBox
            css={{ minWidth: 300 }}
            placeholder="Filter by category"
            options={categoryOptions}
            selectedOptions={searchState.categories.map((category) => ({
              label: category,
              value: category,
              color: CATEGORY_COLOUR_MAP[category],
            }))}
            onChange={(selectedOptions) => {
              handleCategoryChange(
                selectedOptions.map((option) => ({ value: option.value || option.label }))
              );
            }}
            isClearable={true}
            aria-label="Select category"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiComboBox
            css={{ minWidth: 300 }}
            placeholder="Filter by index status"
            options={indexStatusOptions}
            selectedOptions={searchState.indexStatuses.map((status) => ({
              label: status,
              value: status,
              color: status === 'all' ? 'success' : status === 'some' ? 'warning' : 'danger',
            }))}
            onChange={(selectedOptions) => {
              handleIndexStatusChange(
                selectedOptions.map((option) => ({ value: option.value || option.label }))
              );
            }}
            isClearable={true}
            aria-label="Select index status"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};

const QueriesLoading = () => (
  <EuiFlexGroup gutterSize="m" wrap>
    {Array.from({ length: 6 }, (_, i) => (
      <EuiFlexItem key={i} grow={5} css={{ minWidth: 400 }}>
        <EuiPanel>
          <EuiSkeletonText lines={5} />
        </EuiPanel>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const QueriesContent: React.FC<{ queries?: ThreatHuntingQueryWithIndexCheck[] }> = ({
  queries = [],
}) => {
  return (
    <EuiFlexGroup gutterSize="m" wrap>
      {queries?.map((query) => (
        <EuiFlexItem key={query.uuid} grow={5} css={{ minWidth: 400 }}>
          <QueryPanel query={query} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const QueryList: React.FC<{
  queries?: ThreatHuntingQueryWithIndexCheck[];
  isLoading: boolean;
}> = ({ queries, isLoading }) => {
  if (isLoading) {
    return <QueriesLoading />;
  }

  return <QueriesContent queries={queries} />;
};

const ThreatHuntingQueriesComponent = () => {
  const [searchState, setSearchState] = useState<SearchState>({
    q: '',
    categories: [],
    indexStatuses: [],
  });

  const { data: threatHuntingQueries, isLoading } = useListThreatHuntingQueries({
    q: searchState.q,
    categories: searchState.categories,
    indexStatuses: searchState.indexStatuses,
  });

  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
        <HeaderPage title={'Threat Hunting Queries Library'} />
        <EuiFlexGroup gutterSize="m" direction="column" alignItems="center">
          <EuiFlexItem grow={true} css={{ maxWidth: 1200 }}>
            <SearchBar onSearch={setSearchState} />
          </EuiFlexItem>
          <EuiFlexItem grow={true} css={{ maxWidth: 1200 }}>
            <QueryList queries={threatHuntingQueries?.queries} isLoading={isLoading} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.privilegedUserMonitoring} />
    </>
  );
};

export const ThreatHuntingQueriesPage = React.memo(ThreatHuntingQueriesComponent);
