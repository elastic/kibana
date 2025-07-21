/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DocLinks } from '@kbn/doc-links';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { pick } from 'lodash/fp';
import { getPreviousTimeRange } from '../../common/utils/get_time_range';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { SuperDatePicker } from '../../common/components/super_date_picker';
import { useAlertCountQuery } from './use_alert_count_query';
import {
  ACKNOWLEDGED,
  CLOSED,
  OPEN,
} from '../../attack_discovery/pages/results/history/search_and_filter/translations';
import { useFindAttackDiscoveries } from '../../attack_discovery/pages/use_find_attack_discoveries';
import { AIValueMetrics } from '../components/ai_value';
import { APP_ID } from '../../../common';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { HeaderPage } from '../../common/components/header_page';
import * as i18n from './translations';
import { NoPrivileges } from '../../common/components/no_privileges';
import { useKibana } from '../../common/lib/kibana';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';
import { inputsSelectors } from '../../common/store';

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

  const { indicesExist: oldIndicesExist, loading: oldIsSourcererLoading } = useSourcererDataView();
  const { from, to } = useDeepEqualSelector((state) =>
    pick(['from', 'to'], inputsSelectors.valueReportTimeRangeSelector(state))
  );

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { status } = useDataView();

  const isSourcererLoading = newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading;

  const { http } = useKibana().services;
  const { assistantAvailability } = useAssistantContext();
  const { signalIndexName } = useSignalIndex();
  const { hasKibanaREAD, hasIndexRead } = useAlertsPrivileges();
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canReadCases = userCasesPermissions.read;
  const canReadAlerts = hasKibanaREAD && hasIndexRead;
  const { data } = useFindAttackDiscoveries({
    end: to,
    http,
    includeUniqueAlertIds: true,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    start: from,
    status: [OPEN, ACKNOWLEDGED, CLOSED].map((s) => s.toLowerCase()),
  });
  const compareTimeRange = useMemo(() => getPreviousTimeRange({ from, to }), []);
  const { data: compareAdData } = useFindAttackDiscoveries({
    end: compareTimeRange.to,
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    start: compareTimeRange.from,
    status: [OPEN, ACKNOWLEDGED, CLOSED].map((s) => s.toLowerCase()),
  });
  console.log('compare ==>', {
    current: {
      from,
      to,
      data,
    },
    compare: {
      data: compareAdData,
      from: compareTimeRange.from,
      to: compareTimeRange.to,
    },
  });

  const { alertCount } = useAlertCountQuery({
    to,
    from,
    signalIndexName,
  });
  const { alertCount: alertCountCompare } = useAlertCountQuery({
    to: compareTimeRange.to,
    from: compareTimeRange.from,
    signalIndexName,
  });
  console.log('ad data ==>', data);
  if (!canReadAlerts && !canReadCases) {
    return <NoPrivileges docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges} />;
  }

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      <>
        <SecuritySolutionPageWrapper data-test-subj="aiValuePage">
          <HeaderPage
            title={i18n.AI_VALUE_DASHBOARD}
            rightSideItems={[
              <SuperDatePicker
                id={InputsModelId.valueReport}
                showUpdateButton="iconOnly"
                width="auto"
                compressed
              />,
            ]}
          />
          {isSourcererLoading ? (
            <EuiLoadingSpinner size="l" data-test-subj="aiValueLoader" />
          ) : (
            <EuiFlexGroup direction="column" data-test-subj="aiValueSections">
              <EuiFlexItem>
                {data && (
                  <AIValueMetrics
                    from={from}
                    to={to}
                    totalAlerts={alertCount}
                    totalAlertsCompare={alertCountCompare}
                    attackDiscoveryCount={data.total}
                    attackAlertsCount={data.unique_alert_ids_count}
                    attackAlertsCountCompare={compareAdData?.unique_alert_ids_count ?? 0}
                    attackAlertIds={data.unique_alert_ids ?? []}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </SecuritySolutionPageWrapper>
      </>

      <SpyRoute pageName={SecurityPageName.aiValue} />
    </>
  );
};

export const AIValue = React.memo(AIValueComponent);
