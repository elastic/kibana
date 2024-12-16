/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  type EuiBasicTableProps,
  type Pagination,
  type CriteriaWithPagination,
  EuiLink,
} from '@elastic/eui';
import React from 'react';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { TimestampTableCell } from '../timestamp_table_cell';
import type { CloudDefendPolicy } from '../../../common';
import { useKibana } from '../../common/hooks/use_kibana';
import * as TEST_SUBJ from '../../pages/policies/test_subjects';

interface PoliciesTableProps
  extends Pick<
      EuiBasicTableProps<CloudDefendPolicy>,
      'loading' | 'error' | 'noItemsMessage' | 'sorting'
    >,
    Pagination {
  policies: CloudDefendPolicy[];
  setQuery(pagination: CriteriaWithPagination<CloudDefendPolicy>): void;
  'data-test-subj'?: string;
}

const AgentPolicyButtonLink = ({ name, id: policyId }: { name: string; id: string }) => {
  const { http } = useKibana().services;
  const [fleetBase, path] = pagePathGetters.policy_details({ policyId });

  return <EuiLink href={http.basePath.prepend([fleetBase, path].join(''))}>{name}</EuiLink>;
};

const IntegrationButtonLink = ({
  packageName,
  policyId,
  packagePolicyId,
}: {
  packageName: string;
  packagePolicyId: string;
  policyId: string;
}) => {
  const editIntegrationLink = pagePathGetters
    .edit_integration({
      packagePolicyId,
      policyId,
    })
    .join('');

  return <EuiLink href={editIntegrationLink}>{packageName}</EuiLink>;
};

const POLICIES_TABLE_COLUMNS: Array<EuiBasicTableColumn<CloudDefendPolicy>> = [
  {
    field: 'package_policy.name',
    name: i18n.translate('xpack.cloudDefend.policies.policiesTable.integrationNameColumnTitle', {
      defaultMessage: 'Integration Name',
    }),
    render: (packageName, policy) => (
      <IntegrationButtonLink
        packageName={packageName}
        packagePolicyId={policy.package_policy.id}
        policyId={policy.package_policy.policy_ids[0]}
      />
    ),
    truncateText: true,
    sortable: true,
    'data-test-subj': TEST_SUBJ.POLICIES_TABLE_COLUMNS.INTEGRATION_NAME,
  },
  {
    field: 'agent_policy.name',
    name: i18n.translate('xpack.cloudDefend.policies.policiesTable.agentPolicyColumnTitle', {
      defaultMessage: 'Agent Policy',
    }),
    render: (name, policy) => <AgentPolicyButtonLink name={name} id={policy.agent_policy.id} />,
    truncateText: true,
    'data-test-subj': TEST_SUBJ.POLICIES_TABLE_COLUMNS.AGENT_POLICY,
  },
  {
    field: 'agent_policy.agents',
    name: i18n.translate('xpack.cloudDefend.policies.policiesTable.numberOfAgentsColumnTitle', {
      defaultMessage: 'Number of Agents',
    }),
    truncateText: true,
    'data-test-subj': TEST_SUBJ.POLICIES_TABLE_COLUMNS.NUMBER_OF_AGENTS,
  },
  {
    field: 'package_policy.created_by',
    name: i18n.translate('xpack.cloudDefend.policies.policiesTable.createdByColumnTitle', {
      defaultMessage: 'Created by',
    }),
    dataType: 'string',
    truncateText: true,
    sortable: true,
    'data-test-subj': TEST_SUBJ.POLICIES_TABLE_COLUMNS.CREATED_BY,
  },
  {
    field: 'package_policy.created_at',
    name: i18n.translate('xpack.cloudDefend.policies.policiesTable.createdAtColumnTitle', {
      defaultMessage: 'Created at',
    }),
    dataType: 'date',
    truncateText: true,
    render: (timestamp: CloudDefendPolicy['package_policy']['created_at']) => (
      <TimestampTableCell timestamp={timestamp} />
    ),
    sortable: true,
    'data-test-subj': TEST_SUBJ.POLICIES_TABLE_COLUMNS.CREATED_AT,
  },
];

export const PoliciesTable = ({
  policies,
  pageIndex,
  pageSize,
  totalItemCount,
  loading,
  error,
  setQuery,
  noItemsMessage,
  sorting,
  ...rest
}: PoliciesTableProps) => {
  const pagination: Pagination = {
    pageIndex: Math.max(pageIndex - 1, 0),
    pageSize,
    totalItemCount,
  };

  const onChange = ({ page, sort }: CriteriaWithPagination<CloudDefendPolicy>) => {
    setQuery({ page: { ...page, index: page.index + 1 }, sort });
  };

  return (
    <EuiBasicTable
      data-test-subj={rest['data-test-subj']}
      items={policies}
      columns={POLICIES_TABLE_COLUMNS}
      itemId={(item) => [item.agent_policy.id, item.package_policy.id].join('/')}
      pagination={pagination}
      onChange={onChange}
      tableLayout="fixed"
      loading={loading}
      noItemsMessage={noItemsMessage}
      error={error}
      sorting={sorting}
    />
  );
};
