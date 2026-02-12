/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DocLinks } from '@kbn/doc-links';
import { APP_ID } from '../../../common';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { SocTrends } from '../components/detection_response/soc_trends';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { HeaderPage } from '../../common/components/header_page';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { AlertsByStatus } from '../components/detection_response/alerts_by_status';
import { HostAlertsTable } from '../components/detection_response/host_alerts_table';
import { RuleAlertsTable } from '../components/detection_response/rule_alerts_table';
import { UserAlertsTable } from '../components/detection_response/user_alerts_table';
import * as i18n from './translations';
import { CasesTable } from '../components/detection_response/cases_table';
import { CasesByStatus } from '../components/detection_response/cases_by_status';
import { NoPrivileges } from '../../common/components/no_privileges';
import { FiltersGlobal } from '../../common/components/filters_global';
import { useGlobalFilterQuery } from '../../common/hooks/use_global_filter_query';
import { useKibana } from '../../common/lib/kibana';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';

const DetectionResponseComponent = () => {
  const { cases } = useKibana().services;
  const { filterQuery } = useGlobalFilterQuery();

  const { dataView, status } = useDataView();
  const indicesExist = !!dataView.matchedIndices?.length;
  const isSourcererLoading = status !== 'ready';

  const { signalIndexName } = useSignalIndex();
  const { hasAlertsRead, hasIndexRead } = useAlertsPrivileges();
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canReadCases = userCasesPermissions.read;
  const canReadAlerts = hasAlertsRead && hasIndexRead;
  const isSocTrendsEnabled = useIsExperimentalFeatureEnabled('socTrendsEnabled');
  const additionalFilters = useMemo(() => (filterQuery ? [filterQuery] : []), [filterQuery]);

  if (!canReadAlerts && !canReadCases) {
    return <NoPrivileges docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges} />;
  }

  if (status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
          </FiltersGlobal>
          <SecuritySolutionPageWrapper data-test-subj="detectionResponsePage">
            <HeaderPage title={i18n.DETECTION_RESPONSE_TITLE} />
            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="detectionResponseLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="detectionResponseSections">
                <EuiFlexItem>
                  <EuiFlexGroup>
                    {canReadAlerts && (
                      <EuiFlexItem>
                        <AlertsByStatus
                          signalIndexName={signalIndexName}
                          additionalFilters={additionalFilters}
                        />
                      </EuiFlexItem>
                    )}
                    {canReadCases && (
                      <EuiFlexItem>
                        <CasesByStatus />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiFlexGroup direction="column">
                        {canReadAlerts && (
                          <EuiFlexItem>
                            <RuleAlertsTable signalIndexName={signalIndexName} />
                          </EuiFlexItem>
                        )}
                        {canReadCases && (
                          <EuiFlexItem>
                            <CasesTable />
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    {isSocTrendsEnabled && (
                      <EuiFlexItem grow={false}>
                        <SocTrends signalIndexName={signalIndexName} />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>

                {canReadAlerts && (
                  <EuiFlexItem>
                    <EuiFlexGroup>
                      <EuiFlexItem>
                        <HostAlertsTable signalIndexName={signalIndexName} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <UserAlertsTable signalIndexName={signalIndexName} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            )}
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.detectionAndResponse} />
    </>
  );
};

export const DetectionResponse = React.memo(DetectionResponseComponent);
