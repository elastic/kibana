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
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { ThreatHuntingEntitiesTable } from '../components/threat_hunting_entities_table';
import { ThreatHuntingEntityRiskLevels } from '../components/threat_hunting_entity_risk_levels';

const THREAT_HUNTING_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.home.title',
  {
    defaultMessage: 'Entity Threat Hunting',
  }
);

const SignalsSection = () => (
  <EuiPanel paddingSize="xs">
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <ThreatHuntingEntityRiskLevels />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} color="subdued">
          <EuiTitle size="xs">
            <h4>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.threatHunting.home.signals.heatmapTitle',
                {
                  defaultMessage: 'Anomaly explorer',
                }
              )}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.threatHunting.home.signals.heatmapPlaceholder',
                {
                  defaultMessage: 'Heat map visualisation placeholder.',
                }
              )}
            </p>
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

export const ThreatHuntingHomePage: React.FC = () => {
  const [skipEmptyPrompt, setSkipEmptyPrompt] = React.useState(false);
  const onSkip = React.useCallback(() => setSkipEmptyPrompt(true), []);
  const {
    indicesExist: oldIndicesExist,
    loading: oldIsSourcererLoading,
    sourcererDataView: oldSourcererDataViewSpec,
  } = useSourcererDataView();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView, status } = useDataView();
  const indicesExist = useMemo(
    () => (newDataViewPickerEnabled ? !!dataView?.matchedIndices?.length : oldIndicesExist),
    [dataView?.matchedIndices?.length, newDataViewPickerEnabled, oldIndicesExist]
  );

  const isSourcererLoading = useMemo(
    () => (newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading),
    [newDataViewPickerEnabled, oldIsSourcererLoading, status]
  );

  const showEmptyPrompt = !indicesExist && !skipEmptyPrompt;

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      {showEmptyPrompt ? (
        <EmptyPrompt onSkip={onSkip} />
      ) : (
        <>
          <FiltersGlobal>
            <SiemSearchBar
              id={InputsModelId.global}
              sourcererDataView={newDataViewPickerEnabled ? dataView : oldSourcererDataViewSpec}
            />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper data-test-subj="threatHuntingHomePage">
            <HeaderPage title={THREAT_HUNTING_TITLE} />
            <EuiHorizontalRule margin="s" />
            <EuiSpacer size="s" />
            <SignalsSection />

            <EuiSpacer size="l" />
            <ThreatHuntingEntitiesTable />
          </SecuritySolutionPageWrapper>
        </>
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalyticsOverview} />
    </>
  );
};
