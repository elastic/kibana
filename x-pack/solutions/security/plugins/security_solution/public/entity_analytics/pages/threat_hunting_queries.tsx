/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiBadge,
  EuiText,
  EuiFieldSearch,
  EuiSpacer,
  EuiTitle,
  EuiSkeletonText,
  EuiComboBox,
} from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import debounce from 'lodash/debounce';
import type {
  ThreatHuntingQueryIndexStatus,
  ThreatHuntingQueryWithIndexCheck,
} from '../../../common/api/entity_analytics/threat_hunting/common.gen';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useListThreatHuntingQueries } from '../api/hooks/use_list_threat_hunting_queries';
import { ThreatHuntingQueryPanelKey } from '../../flyout/threat_hunting_query_details/right';
import { ThreatHuntingQueryDiscoverLink } from '../components/threat_hunting_query_discover_link';
import {
  CategoryBadge,
  IndexStatusBadge,
  ESQLBadge,
  CATEGORY_COLOUR_MAP,
  QueryCountBadge,
} from '../components/threat_hunting_badges';

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
  const { openFlyout } = useExpandableFlyoutApi();

  const shortenedDescription = toShortenedDescription(description);

  const onOpenFlyout = useCallback(
    () =>
      openFlyout({
        right: {
          id: ThreatHuntingQueryPanelKey,
          params: {
            queryUuid: query.uuid,
          },
        },
      }),
    [openFlyout, query.uuid]
  );

  return (
    <EuiPanel onClick={onOpenFlyout}>
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
              <ESQLBadge />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <IndexStatusBadge status={indexStatus} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <QueryCountBadge query={query} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={{ minHeight: 60 }}>
          <EuiText size="s" color="subdued">
            {shortenedDescription}
          </EuiText>
        </EuiFlexItem>

        {query.queries.length === 1 && (
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <ThreatHuntingQueryDiscoverLink query={query.queries[0]} />
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
  const [searchQuery, setSearchQuery] = useState('');

  // Use a debounced function for text search
  const debouncedSearch = useCallback(
    (newSearch: string) => {
      const handler = debounce((search: string) => {
        const updatedFilters = { ...searchState, q: search } as SearchState;
        setSearchState(updatedFilters);
        onSearch(updatedFilters);
      }, 300);
      handler(newSearch);
    },
    [searchState, onSearch]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFilterChange = (field: keyof typeof searchState, value: any) => {
    const updatedFilters = { ...searchState, [field]: value } as SearchState;
    setSearchState(updatedFilters);
    onSearch(updatedFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    debouncedSearch(newValue);
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
            value={searchQuery}
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
