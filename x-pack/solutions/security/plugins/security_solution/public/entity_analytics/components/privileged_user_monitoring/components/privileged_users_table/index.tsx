/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import {
  useEuiTheme,
  EuiPanel,
  EuiFlexGroup,
  EuiText,
  EuiFlexItem,
  EuiSpacer,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiBasicTable,
  EuiProgress,
  EuiCallOut,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { take } from 'lodash/fp';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useQuery } from '@tanstack/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { useRiskScore } from '../../../../api/hooks/use_risk_score';
import type { TableItemType } from './types';
import { getPrivilegedUsersQuery } from './esql_source_query';
import { UserPanelKey } from '../../../../../flyout/entity_details/shared/constants';
import type { EntityRiskScore } from '../../../../../../common/search_strategy';
import { buildEntityNameFilter, EntityType } from '../../../../../../common/search_strategy';
import { buildPrivilegedUsersTableColumns } from './columns';
import { esqlResponseToRecords } from '../../../../../common/utils/esql';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGlobalFilterQuery } from '../../../../../common/hooks/use_global_filter_query';
import { HeaderSection } from '../../../../../common/components/header_section';
import { useAssetCriticalityFetchList } from '../../../asset_criticality/use_asset_criticality';
import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';

export const DEFAULT_PAGE_SIZE = 10;

export const PRIVILEGED_USERS_TABLE_QUERY_ID = 'privmonPrivilegedUsersTableQueryId';

const TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.title',
  { defaultMessage: 'Privileged users' }
);

const PRIVILEGED_USERS_TABLE_ID = 'PrivilegedUsers-table';

const useOpenUserFlyout = () => {
  const { openFlyout } = useExpandableFlyoutApi();

  return (userName: string) => {
    openFlyout({
      right: {
        id: UserPanelKey,
        params: {
          contextID: PRIVILEGED_USERS_TABLE_ID,
          userName,
          scopeId: PRIVILEGED_USERS_TABLE_ID,
        },
      },
    });
  };
};

interface RiskScoresByUserName {
  [key: string]: EntityRiskScore<EntityType.user>;
}

interface AssetCriticalityByUserName {
  [key: string]: CriticalityLevelWithUnassigned;
}

export const PrivilegedUsersTable: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(PRIVILEGED_USERS_TABLE_QUERY_ID);

  const { euiTheme } = useEuiTheme();

  const { data } = useKibana().services;

  const openUserFlyout = useOpenUserFlyout();

  const columns = buildPrivilegedUsersTableColumns(openUserFlyout, euiTheme);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const privilegedUsersTableQuery = getPrivilegedUsersQuery(spaceId);

  const { filterQuery: filterQueryWithoutTimerange } = useGlobalFilterQuery();

  const {
    data: result,
    isLoading: loadingPrivilegedUsers,
    isError: privilegedUsersError,
  } = useQuery({
    queryKey: ['privileged-users-table', privilegedUsersTableQuery, filterQueryWithoutTimerange],
    enabled: toggleStatus,
    queryFn: async () => {
      return getESQLResults({
        esqlQuery: privilegedUsersTableQuery,
        search: data.search.search,
        filter: filterQueryWithoutTimerange,
      });
    },
  });

  const records = useMemo(() => esqlResponseToRecords<TableItemType>(result?.response), [result]);

  const nameFilterQuery = useMemo(() => {
    const userNames = records.map((user) => user['user.name']);
    return buildEntityNameFilter(EntityType.user, userNames);
  }, [records]);

  const {
    data: riskScoreData,
    error: riskScoreError,
    loading: loadingRiskScore,
    hasEngineBeenInstalled: hasRiskEngineBeenInstalled,
  } = useRiskScore<EntityType.user>({
    riskEntity: EntityType.user,
    filterQuery: nameFilterQuery,
    onlyLatest: true,
    pagination: {
      cursorStart: 0,
      querySize: records.length,
    },
    skip: nameFilterQuery === undefined,
  });

  const riskScores = riskScoreData && riskScoreData.length > 0 ? riskScoreData : [];

  const riskScoreByUserName: RiskScoresByUserName = Object.fromEntries(
    riskScores.map((riskScore) => [riskScore.user.name, riskScore])
  );

  const {
    data: assetCriticalityData,
    isError: assetCriticalityError,
    isLoading: loadingAssetCriticality,
  } = useAssetCriticalityFetchList({
    idField: 'user.name',
    idValues: records.map((user) => user['user.name']),
    skip: !toggleStatus,
  });

  const assetCriticalityRecords =
    assetCriticalityData && assetCriticalityData.records.length > 0
      ? assetCriticalityData.records
      : [];

  const assetCriticalityByUserName: AssetCriticalityByUserName = Object.fromEntries(
    assetCriticalityRecords.map((assetCriticalityRecord) => [
      assetCriticalityRecord.id_value,
      assetCriticalityRecord.criticality_level,
    ])
  );

  const enrichedRecords: TableItemType[] = useMemo(
    () =>
      records.map((record, index) => {
        let enrichedFields = {};

        const riskScore: EntityRiskScore<EntityType.user> | undefined =
          riskScoreByUserName[record['user.name']];
        if (riskScore) {
          enrichedFields = {
            ...enrichedFields,
            risk_score: riskScore.user.risk.calculated_score_norm,
            risk_level: riskScore.user.risk.calculated_level,
          };
        }

        const assetCriticality: CriticalityLevelWithUnassigned | undefined =
          assetCriticalityByUserName[record['user.name']];

        if (assetCriticality) {
          enrichedFields = {
            ...enrichedFields,
            criticality_level: assetCriticality,
          };
        }

        return {
          ...record,
          ...enrichedFields,
        };
      }),
    [records, riskScoreByUserName, assetCriticalityByUserName]
  );

  const visibleRecords = take(currentPage * DEFAULT_PAGE_SIZE, enrichedRecords);

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="privileged-users-table-panel">
      <HeaderSection
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        id={PRIVILEGED_USERS_TABLE_QUERY_ID}
        showInspectButton={false}
        title={TITLE}
        titleSize="s"
        outerDirection="column"
        hideSubtitle
      />
      {(privilegedUsersError ||
        (hasRiskEngineBeenInstalled && riskScoreError) ||
        assetCriticalityError) && (
        <EuiCallOut
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.error',
            {
              defaultMessage:
                'There was an error retrieving privileged users. Results may be incomplete.',
            }
          )}
          color="danger"
          iconType="error"
        />
      )}
      {toggleStatus && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            {(loadingPrivilegedUsers || loadingRiskScore || loadingAssetCriticality) && (
              <EuiProgress size="xs" color="accent" />
            )}
          </EuiFlexItem>
          {records.length > 0 && (
            <>
              <EuiText size={'s'}>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.showing"
                  defaultMessage="Showing "
                />
                <span
                  css={css`
                    font-weight: ${euiTheme.font.weight.bold};
                  `}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.countOfUsers"
                    defaultMessage="{count} privileged {count, plural, one {user} other {users}}"
                    values={{ count: visibleRecords.length }}
                  />
                </span>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiHorizontalRule margin="none" style={{ height: 2 }} />
              <EuiBasicTable
                id={PRIVILEGED_USERS_TABLE_QUERY_ID}
                loading={loadingPrivilegedUsers || loadingRiskScore || loadingAssetCriticality}
                items={visibleRecords || []}
                columns={columns}
              />
            </>
          )}
          {records.length > currentPage * DEFAULT_PAGE_SIZE && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isLoading={loadingRiskScore || loadingPrivilegedUsers || loadingAssetCriticality}
                onClick={() => {
                  setCurrentPage((page) => page + 1);
                }}
                flush="right"
                color="primary"
                size="s"
                iconType="sortDown"
                iconSide="right"
                iconSize="s"
              >
                <FormattedMessage
                  id="xpack.securitySolution.privilegedUserMonitoring.showMore"
                  defaultMessage="Show more"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
