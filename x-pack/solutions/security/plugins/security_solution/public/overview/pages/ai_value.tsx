/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { DocLinks } from '@kbn/doc-links';
import { AIValueMetrics } from '../components/ai_value';
import { APP_ID } from '../../../common';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { HeaderPage } from '../../common/components/header_page';

import { EmptyPrompt } from '../../common/components/empty_prompt';
import * as i18n from './translations';
import { NoPrivileges } from '../../common/components/no_privileges';
import { FiltersGlobal } from '../../common/components/filters_global';
import { useGlobalFilterQuery } from '../../common/hooks/use_global_filter_query';
import { useKibana } from '../../common/lib/kibana';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useDataViewSpec } from '../../data_view_manager/hooks/use_data_view_spec';
import { PageLoader } from '../../common/components/page_loader';

/**
 * The dashboard includes key performance metrics such as:
 * Cost savings (e.g., based on time saved × analyst hourly rate)
 * Analyst time saved (e.g., minutes saved per alert × volume)
 * Total alerts filtered vs escalated
 * Real attacks detected by AI vs traditional methods
 * Alert response time trends (before vs after AI adoption)
 *
 * Metrics are calculated using dynamic values from the user’s actual data and can be customized per deployment.
 * Visualizations are executive-friendly: concise, interactive, and exportable.
 * Time range selection and historical trend views are supported.
 * Data sources and calculation methods are transparent and documented for auditability.
 * @constructor
 */

const AIValueComponent = () => {
  const { cases } = useKibana().services;
  const { filterQuery } = useGlobalFilterQuery();

  const {
    indicesExist: oldIndicesExist,
    loading: oldIsSourcererLoading,
    sourcererDataView: oldSourcererDataView,
  } = useSourcererDataView();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView, status } = useDataView();
  const { dataViewSpec } = useDataViewSpec();

  const sourcererDataView = newDataViewPickerEnabled ? dataViewSpec : oldSourcererDataView;
  const indicesExist = newDataViewPickerEnabled
    ? !!dataView?.matchedIndices?.length
    : oldIndicesExist;
  const isSourcererLoading = newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading;

  const { signalIndexName } = useSignalIndex();
  const { hasKibanaREAD, hasIndexRead } = useAlertsPrivileges();
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canReadCases = userCasesPermissions.read;
  const canReadAlerts = hasKibanaREAD && hasIndexRead;
  const additionalFilters = useMemo(() => (filterQuery ? [filterQuery] : []), [filterQuery]);

  if (!canReadAlerts && !canReadCases) {
    return <NoPrivileges docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges} />;
  }

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
          </FiltersGlobal>
          <SecuritySolutionPageWrapper data-test-subj="aiValuePage">
            <HeaderPage title={i18n.AI_VALUE_DASHBOARD} />
            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="aiValueLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="aiValueSections">
                <EuiFlexItem>
                  <EuiFlexGroup>
                    {'Do AI Value!!!'}
                    <EuiText>
                      <h2>{'Your AI Security ROI'}</h2>
                    </EuiText>
                    <AIValueMetrics />
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiFlexGroup direction="column">{'Do AI Value!!!'}</EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.aiValue} />
    </>
  );
};

export const AIValue = React.memo(AIValueComponent);
