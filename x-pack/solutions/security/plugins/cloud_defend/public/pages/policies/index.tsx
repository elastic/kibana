/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFieldSearchProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { CloudDefendPageTitle } from '../../components/cloud_defend_page_title';
import { CloudDefendPage } from '../../components/cloud_defend_page';
import { PoliciesTable } from '../../components/policies_table';
import { useCloudDefendPolicies, UseCloudDefendPoliciesProps } from './use_cloud_defend_policies';
import { extractErrorMessage } from '../../../common/utils/helpers';
import * as TEST_SUBJ from './test_subjects';
import { LOCAL_STORAGE_PAGE_SIZE } from '../../common/constants';
import { usePageSize } from '../../common/hooks/use_page_size';
import { useCloudDefendIntegrationLinks } from '../../common/navigation/use_cloud_defend_integration_links';

const SEARCH_DEBOUNCE_MS = 300;

const AddIntegrationButton = () => {
  const { addIntegrationLink } = useCloudDefendIntegrationLinks();

  return (
    <EuiButton
      data-test-subj={TEST_SUBJ.ADD_INTEGRATION_TEST_SUBJ}
      fill
      iconType="plusInCircle"
      href={addIntegrationLink}
    >
      <FormattedMessage
        id="xpack.cloudDefend.policies.policiesPageHeader.addIntegrationButtonLabel"
        defaultMessage="Add Integration"
      />
    </EuiButton>
  );
};

const EmptyState = ({ name }: { name: string }) => (
  <div>
    <EuiSpacer size="l" />
    {
      <EuiText>
        <strong>
          <FormattedMessage
            id="xpack.cloudDefend.policies.policyEmptyState.integrationsNotFoundTitle"
            defaultMessage="No policies found"
          />
          {name && (
            <FormattedMessage
              id="xpack.cloudDefend.policies.policyEmptyState.integrationsNotFoundForNameTitle"
              defaultMessage=' for "{name}"'
              values={{ name }}
            />
          )}
        </strong>
      </EuiText>
    }
    <EuiSpacer size="s" />
    <EuiText>
      <EuiTextColor color="subdued">
        <FormattedMessage
          id="xpack.cloudDefend.policies.policyEmptyState.integrationsNotFoundWithFiltersTitle"
          defaultMessage="We weren't able to find any policies with the above filters."
        />
      </EuiTextColor>
    </EuiText>
    <EuiSpacer size="l" />
  </div>
);

const TotalIntegrationsCount = ({
  pageCount,
  totalCount,
}: Record<'pageCount' | 'totalCount', number>) => (
  <EuiText size="xs" css={{ marginLeft: 8 }}>
    <EuiTextColor color="subdued">
      <FormattedMessage
        id="xpack.cloudDefend.policies.totalIntegrationsCountMessage"
        defaultMessage="Showing {pageCount} of {totalCount, plural, one {# integration} other {# integrations}}"
        values={{ pageCount, totalCount }}
      />
    </EuiTextColor>
  </EuiText>
);

const SearchField = ({
  onSearch,
  isLoading,
}: Required<Pick<EuiFieldSearchProps, 'isLoading' | 'onSearch'>>) => {
  const [localValue, setLocalValue] = useState('');

  useDebounce(() => onSearch(localValue), SEARCH_DEBOUNCE_MS, [localValue]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={true} css={{ alignItems: 'flex-end' }}>
        <EuiFieldSearch
          fullWidth
          onSearch={setLocalValue}
          isLoading={isLoading}
          placeholder={i18n.translate(
            'xpack.cloudDefend.policies.policySearchField.searchPlaceholder',
            { defaultMessage: 'Search integration name' }
          )}
          incremental
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Policies = () => {
  const { pageSize, setPageSize } = usePageSize(LOCAL_STORAGE_PAGE_SIZE);
  const [query, setQuery] = useState<UseCloudDefendPoliciesProps>({
    name: '',
    page: 1,
    perPage: pageSize,
    sortField: 'package_policy.name',
    sortOrder: 'asc',
  });

  const queryResult = useCloudDefendPolicies(query);
  const totalItemCount = queryResult.data?.total || 0;

  return (
    <CloudDefendPage>
      <EuiPageHeader
        data-test-subj={TEST_SUBJ.POLICIES_PAGE_HEADER}
        pageTitle={
          <CloudDefendPageTitle
            title={i18n.translate('xpack.cloudDefend.policies.policiesPageHeader', {
              defaultMessage: 'Defend for containers (D4C)',
            })}
          />
        }
        rightSideItems={[<AddIntegrationButton />]}
        bottomBorder
      />
      <EuiSpacer />
      <SearchField
        isLoading={queryResult.isFetching}
        onSearch={(name) => setQuery((current) => ({ ...current, name }))}
      />
      <EuiSpacer />
      <TotalIntegrationsCount
        pageCount={(queryResult.data?.items || []).length}
        totalCount={totalItemCount}
      />
      <EuiSpacer size="s" />
      <PoliciesTable
        policies={queryResult.data?.items || []}
        data-test-subj={TEST_SUBJ.POLICIES_TABLE_DATA_TEST_SUBJ}
        error={queryResult.error ? extractErrorMessage(queryResult.error) : undefined}
        loading={queryResult.isFetching}
        pageIndex={query.page}
        pageSize={pageSize || query.perPage}
        sorting={{
          // @ts-expect-error - EUI types currently do not support sorting by nested fields
          sort: { field: query.sortField, direction: query.sortOrder },
          allowNeutralSort: false,
        }}
        totalItemCount={totalItemCount}
        setQuery={({ page, sort }) => {
          setPageSize(page.size);
          setQuery((current) => ({
            ...current,
            page: page.index,
            perPage: page.size,
            sortField:
              (sort?.field as UseCloudDefendPoliciesProps['sortField']) || current.sortField,
            sortOrder: sort?.direction || current.sortOrder,
          }));
        }}
        noItemsMessage={
          queryResult.isSuccess && !queryResult.data.total ? (
            <EmptyState name={query.name} />
          ) : undefined
        }
      />
    </CloudDefendPage>
  );
};
