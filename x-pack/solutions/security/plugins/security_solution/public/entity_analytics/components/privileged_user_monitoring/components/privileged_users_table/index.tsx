/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
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
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { UserPanelKey } from '../../../../../flyout/entity_details/shared/constants';

import { buildPrivilegedUsersTableColumns } from './columns';
import { HeaderSection } from '../../../../../common/components/header_section';
import { usePrivilegedUsersTableData } from './hooks';

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

export const PrivilegedUsersTable: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { setQuery, deleteQuery } = useGlobalTime();
  const { toggleStatus, setToggleStatus } = useQueryToggle(PRIVILEGED_USERS_TABLE_QUERY_ID);

  const { euiTheme } = useEuiTheme();

  const openUserFlyout = useOpenUserFlyout();

  const columns = buildPrivilegedUsersTableColumns(openUserFlyout, euiTheme);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { visibleRecords, isLoading, hasError, refetch, inspect, hasNextPage } =
    usePrivilegedUsersTableData(spaceId, currentPage, toggleStatus);

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: PRIVILEGED_USERS_TABLE_QUERY_ID,
    loading: isLoading,
  });

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="privileged-users-table-panel">
        <HeaderSection
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
          id={PRIVILEGED_USERS_TABLE_QUERY_ID}
          title={TITLE}
          titleSize="m"
          outerDirection="column"
          hideSubtitle
        />
        {hasError && (
          <EuiCallOut
            announceOnMount
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
            <EuiFlexItem>{isLoading && <EuiProgress size="xs" color="accent" />}</EuiFlexItem>
            {visibleRecords.length > 0 ? (
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
                <EuiHorizontalRule margin="none" css={{ height: 2 }} />
                <EuiBasicTable
                  id={PRIVILEGED_USERS_TABLE_QUERY_ID}
                  tableCaption={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.tableCaption',
                    { defaultMessage: 'Privileged users list' }
                  )}
                  loading={isLoading}
                  items={visibleRecords || []}
                  columns={columns}
                />
              </>
            ) : (
              !isLoading && (
                <EuiText size="s" color="subdued" textAlign="center">
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.noData"
                    defaultMessage="No privileged users found"
                  />
                </EuiText>
              )
            )}
            {hasNextPage && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  isLoading={isLoading}
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
    </InspectButtonContainer>
  );
};
