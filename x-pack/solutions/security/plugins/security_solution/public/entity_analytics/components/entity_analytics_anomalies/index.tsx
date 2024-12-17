/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import { MLJobsAwaitingNodeWarning, ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { HeaderSection } from '../../../common/components/header_section';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { LastUpdatedAt } from '../../../common/components/last_updated_at';
import * as i18n from './translations';
import { useAggregatedAnomaliesByJob } from '../../../common/components/ml/anomaly/use_anomalies_search';
import { useAnomaliesColumns } from './columns';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import {
  LinkAnchor,
  LinkButton,
  useGetSecuritySolutionLinkProps,
} from '../../../common/components/links';
import { HostsTableType } from '../../../explore/hosts/store/model';
import { getTabsOnHostsUrl } from '../../../common/components/link_to/redirect_to_hosts';
import { SecurityPageName } from '../../../app/types';
import { getTabsOnUsersUrl } from '../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../explore/users/store/model';
import { useKibana } from '../../../common/lib/kibana';
import type { SecurityJob } from '../../../common/components/ml_popover/types';

const TABLE_QUERY_ID = 'entityAnalyticsDashboardAnomaliesTable';

const TABLE_SORTING = {
  sort: {
    field: 'count',
    direction: 'desc',
  },
} as const;

export const ENTITY_ANALYTICS_ANOMALIES_PANEL = 'entity_analytics_anomalies';

export const EntityAnalyticsAnomalies = () => {
  const [recentlyEnabledJobIds, setRecentlyEnabledJobIds] = useState<string[]>([]);

  const {
    services: { ml, http, docLinks },
  } = useKibana();

  const jobsUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  });

  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const { toggleStatus, setToggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const { deleteQuery, setQuery, from, to } = useGlobalTime();
  const {
    isLoading: isSearchLoading,
    data,
    refetch,
  } = useAggregatedAnomaliesByJob({
    skip: !toggleStatus,
    from,
    to,
  });

  const onJobEnabled = useCallback(async (job: SecurityJob) => {
    setRecentlyEnabledJobIds((current) => [...current, job.id]);
  }, []);

  const columns = useAnomaliesColumns(isSearchLoading, onJobEnabled, recentlyEnabledJobIds);
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [isSearchLoading]); // Update the time when data loads

  useQueryInspector({
    refetch,
    queryId: TABLE_QUERY_ID,
    loading: isSearchLoading,
    setQuery,
    deleteQuery,
  });

  const [goToHostsAnomaliesTab, hostsAnomaliesTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.hosts,
      path: getTabsOnHostsUrl(HostsTableType.anomalies),
    });
    return [onClick, href];
  }, [getSecuritySolutionLinkProps]);

  const [goToUsersAnomaliesTab, usersAnomaliesTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.users,
      path: getTabsOnUsersUrl(UsersTableType.anomalies),
    });
    return [onClick, href];
  }, [getSecuritySolutionLinkProps]);

  const installedJobsIds = useMemo(
    () =>
      data
        .filter(({ job }) => !!job && job.isInstalled)
        .map(({ job }) => job?.id ?? '')
        .concat(recentlyEnabledJobIds),
    [data, recentlyEnabledJobIds]
  );

  const incompatibleJobCount = useMemo(
    () => data.filter(({ job }) => job && !job.isCompatible).length,
    [data]
  );

  return (
    <EuiPanel hasBorder data-test-subj={ENTITY_ANALYTICS_ANOMALIES_PANEL}>
      <HeaderSection
        title={i18n.ANOMALIES_TITLE}
        titleSize="s"
        subtitle={<LastUpdatedAt isUpdating={isSearchLoading} updatedAt={updatedAt} />}
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        tooltip={i18n.ANOMALIES_TOOLTIP}
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <LinkAnchor
              data-test-subj="anomalies_table_hosts_link"
              onClick={goToHostsAnomaliesTab}
              href={hostsAnomaliesTabUrl}
              className="eui-textNoWrap"
            >
              {i18n.VIEW_ALL_HOSTS_ANOMALIES}
            </LinkAnchor>
          </EuiFlexItem>
          <EuiFlexItem>
            <LinkAnchor
              data-test-subj="anomalies_table_users_link"
              onClick={goToUsersAnomaliesTab}
              href={usersAnomaliesTabUrl}
              className="eui-textNoWrap"
            >
              {i18n.VIEW_ALL_USERS_ANOMALIES}
            </LinkAnchor>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LinkButton data-test-subj="anomalies_table_all" href={jobsUrl} target="_blank">
              {i18n.VIEW_ALL_ANOMALIES}
            </LinkButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderSection>

      {toggleStatus && (
        <>
          {incompatibleJobCount > 0 && (
            <>
              <EuiCallOut
                title={i18n.MODULE_NOT_COMPATIBLE_TITLE(incompatibleJobCount)}
                data-test-subj="incompatible_jobs_warnings"
                color="warning"
                iconType="warning"
                size="s"
              >
                <p>
                  <FormattedMessage
                    defaultMessage="We could not find any data, see {mlDocs} for more information on Machine Learning job requirements."
                    id="xpack.securitySolution.components.mlPopup.moduleNotCompatibleDescription"
                    values={{
                      mlDocs: (
                        <a
                          href={`${docLinks.links.siem.ml}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {i18n.ANOMALY_DETECTION_DOCS}
                        </a>
                      ),
                    }}
                  />
                </p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}
          <MLJobsAwaitingNodeWarning jobIds={installedJobsIds} />
          <EuiInMemoryTable
            responsiveBreakpoint={false}
            items={data}
            columns={columns}
            pagination={{
              showPerPageOptions: true,
            }}
            loading={isSearchLoading}
            id={TABLE_QUERY_ID}
            sorting={TABLE_SORTING}
          />
        </>
      )}
    </EuiPanel>
  );
};
