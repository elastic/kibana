/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n as i18nCore } from '@kbn/i18n';
import type { DocLinks } from '@kbn/doc-links';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import { APP_ID } from '../../../common';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { AlertsByStatus } from '../components/detection_response/alerts_by_status';
import { HostAlertsTable } from '../components/detection_response/host_alerts_table';
import { RuleAlertsTable } from '../components/detection_response/rule_alerts_table';
import { UserAlertsTable } from '../components/detection_response/user_alerts_table';
import * as i18n from './translations';
import { CasesTable } from '../components/detection_response/cases_table';
import { CasesByStatus } from '../components/detection_response/cases_by_status';
import { NoPrivileges } from '../../common/components/no_privileges';
import { useGlobalFilterQuery } from '../../common/hooks/use_global_filter_query';
import { useAddIntegrationsUrl } from '../../common/hooks/use_add_integrations_url';
import { useKibana } from '../../common/lib/kibana';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';

const DetectionResponseComponent = () => {
  const { euiTheme } = useEuiTheme();
  const { cases } = useKibana().services;
  const { filterQuery } = useGlobalFilterQuery();
  const { href: addIntegrationsHref } = useAddIntegrationsUrl();
  const { navigateTo } = useNavigateTo();

  const { dataView, status } = useDataView();
  const isDataViewReady = status === 'ready';
  const indicesExist = !!dataView.matchedIndices?.length;
  const isSourcererLoading = status === 'loading';

  const { signalIndexName } = useSignalIndex();
  const { hasAlertsRead, hasIndexRead } = useAlertsPrivileges();
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canReadCases = userCasesPermissions.read;
  const canReadAlerts = hasAlertsRead && hasIndexRead;
  const additionalFilters = useMemo(() => (filterQuery ? [filterQuery] : []), [filterQuery]);

  // Add integrations in the kebab so Feedback (global static item) also surfaces — same as TI / Dashboards.
  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'addIntegrations',
          label: i18nCore.translate(
            'xpack.securitySolution.detectionResponse.addIntegrationsMenuItem',
            { defaultMessage: 'Add integrations' }
          ),
          iconType: 'indexOpen',
          href: addIntegrationsHref,
          overflow: true,
          testId: 'detectionResponseHeaderAddIntegrations',
          run: () => {
            navigateTo({ url: addIntegrationsHref });
          },
        },
      ],
    }),
    [addIntegrationsHref, navigateTo]
  );

  // Security section defaults to paddingSize "l" (24px). Figma uses 16px — same pattern as Rules.
  const chromeNextPage = css`
    margin: -${euiTheme.size.l};
    padding: ${euiTheme.size.base};
  `;

  // Same FiltersGlobal shell (subdued full-bleed), kept in-page under AppHeader instead of the KQL portal.
  const kqlBar = css`
    margin-inline: -${euiTheme.size.base};
  `;

  const kqlBarHeader = css`
    @media (max-width: 767px) {
      overflow-x: auto;
    }
  `;

  if (!canReadAlerts && !canReadCases) {
    return <NoPrivileges docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges} />;
  }

  if (status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      {indicesExist ? (
        <SecuritySolutionPageWrapper data-test-subj="detectionResponsePage">
          <div css={chromeNextPage}>
            {/* [Chrome Next] Migrated header — parent supplies the Figma 16px page grid via bleed. */}
            <AppHeader title={i18n.DETECTION_RESPONSE_TITLE} menu={menu} spacing="bleed" />
            {/* Same FiltersGlobal panel styling — only the placement moved below AppHeader. */}
            {isDataViewReady && (
              <div css={kqlBar}>
                <EuiPanel borderRadius="none" color="subdued" paddingSize="none">
                  <header data-test-subj="filters-global-container" css={kqlBarHeader}>
                    <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
                  </header>
                </EuiPanel>
              </div>
            )}
            <EuiSpacer size="m" />
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
          </div>
        </SecuritySolutionPageWrapper>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.detectionAndResponse} />
    </>
  );
};

export const DetectionResponse = React.memo(DetectionResponseComponent);
