/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiFlexItem,
  EuiPanel,
  EuiLink,
  EuiBadge,
  EuiTitle,
  EuiText,
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
  const categoryColorMap: Record<string, string> = {
    windows: '#a7d0f4', // even lighter blue
    linux: '#ffebc0', // even lighter amber
    macos: '#c1ecea', // even lighter teal
    llm: '#f4d0cf', // even lighter red
    azure: '#d7c8f2', // even lighter purple
    okta: '#c0e8e5', // even lighter green
    aws: '#fbd0e6', // even lighter pink
  };

  return <EuiBadge color={categoryColorMap[category] || 'hollow'}>{category}</EuiBadge>;
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
  console.log('query', query);
  console.log('category', category);
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

        {discoverLogsLink && (
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
const ThreatHuntingQueriesComponent = () => {
  const { data: threatHuntingQueries, isLoading } = useListThreatHuntingQueries({});
  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
        <HeaderPage title={'Threat Hunting Queries'} />
        <EuiFlexGroup gutterSize="m" direction="column" alignItems="center">
          <EuiFlexItem>
            {isLoading ? (
              <EuiLoadingSpinner size="xl" />
            ) : (
              <EuiFlexGroup gutterSize="m" css={{ maxWidth: 1200 }} wrap>
                {threatHuntingQueries?.queries.map((query) => (
                  <EuiFlexItem key={query.uuid} grow={5} css={{ minWidth: 400 }}>
                    <QueryPanel query={query} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.privilegedUserMonitoring} />
    </>
  );
};

export const ThreatHuntingQueriesPage = React.memo(ThreatHuntingQueriesComponent);
