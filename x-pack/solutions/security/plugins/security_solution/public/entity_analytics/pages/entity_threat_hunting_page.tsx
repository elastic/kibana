/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';
import { PageScope } from '../../data_view_manager/constants';
import { CombinedRiskDonutChart } from '../components/threat_hunting/combined_risk_donut_chart';
import { AnomaliesPlaceholderPanel } from '../components/threat_hunting/anomalies_placeholder_panel';
import { ThreatHuntingEntitiesTable } from '../components/threat_hunting/threat_hunting_entities_table';

export const EntityThreatHuntingPage = () => {
  const { dataView, status } = useDataView(PageScope.explore);

  const indicesExist = useMemo(
    () => !!dataView?.matchedIndices?.length,
    [dataView?.matchedIndices?.length]
  );

  const showEmptyPrompt = !indicesExist;

  if (status === 'pristine' || status !== 'ready') {
    return <PageLoader />;
  }

  if (showEmptyPrompt) {
    return <EmptyPrompt />;
  }

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper data-test-subj="threatHuntingPage">
        <HeaderPage
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.threatHunting.pageTitle"
              defaultMessage="Entity Threat Hunting"
            />
          }
        />
        <EuiFlexGroup direction="column" gutterSize="l">
          {/* Donut Chart and Anomalies Panel Row */}
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiFlexGroup responsive={false} gutterSize="l">
                <EuiFlexItem grow={1}>
                  <CombinedRiskDonutChart />
                </EuiFlexItem>
                <EuiFlexItem grow={1}>
                  <AnomaliesPlaceholderPanel />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          {/* Entities Table */}
          <EuiFlexItem>
            <ThreatHuntingEntitiesTable />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.entityAnalyticsThreatHunting} />
    </>
  );
};
