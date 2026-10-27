/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { DataQualityPanel, ECS_REFERENCE_URL } from '@kbn/ecs-data-quality-dashboard';
import type { OnTimeChangeProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAssistantAvailability } from '../../assistant/use_assistant_availability';
import { DASHBOARDS } from '../../app/translations';
import { SecurityPageName } from '../../app/types';
import { SecurityAppHeader } from '../../common/components/app_header';
import { useThemes } from '../../common/components/charts/common';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useLocalStorage } from '../../common/components/local_storage';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { APP_ID, DEFAULT_BYTES_FORMAT, DEFAULT_NUMBER_FORMAT } from '../../../common/constants';
import { KibanaServices, useKibana, useToasts, useUiSetting$ } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import * as i18n from './translations';
import {
  DataQualityEventTypes,
  type ReportDataQualityCheckAllCompletedParams,
  type ReportDataQualityIndexCheckedParams,
} from '../../common/lib/telemetry';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useSelectedPatterns } from '../../data_view_manager/hooks/use_selected_patterns';
import { DataViewPicker } from '../../data_view_manager/components/data_view_picker';
import { PageScope } from '../../data_view_manager/constants';
import { PageLoader } from '../../common/components/page_loader';

const LOCAL_STORAGE_KEY = 'dataQualityDashboardLastChecked';

const DEFAULT_START_TIME = 'now-7d';
const DEFAULT_END_TIME = 'now';

const DataQualityComponent: React.FC = () => {
  const { isAssistantEnabled } = useAssistantAvailability();
  const httpFetch = KibanaServices.get().http.fetch;
  const { baseTheme, theme } = useThemes();
  const toasts = useToasts();

  const [defaultBytesFormat] = useUiSetting$<string>(DEFAULT_BYTES_FORMAT);
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const { dataView, status } = useDataView();
  const selectedPatterns = useSelectedPatterns(dataView);

  const indicesExist = !!dataView?.matchedIndices?.length;

  const { signalIndexName, loading: isSignalIndexNameLoading } = useSignalIndex();
  const { configSettings, cases, docLinks, telemetry } = useKibana().services;
  const isILMAvailable = configSettings.ILMEnabled;

  const [startDate, setStartTime] = useState<string>();
  const [endDate, setEndTime] = useState<string>();
  const onTimeChange = useCallback(({ start, end, isInvalid }: OnTimeChangeProps) => {
    if (isInvalid) {
      return;
    }

    setStartTime(start);
    setEndTime(end);
  }, []);

  useEffect(() => {
    if (!isILMAvailable) {
      setStartTime(DEFAULT_START_TIME);
      setEndTime(DEFAULT_END_TIME);
    }
  }, [isILMAvailable]);

  /**
   * Merges the detection alerts index with sourcerer / data view index patterns for the ECS Data Quality panel.
   * Deduplicates when the same pattern (e.g. `.alerts-security.alerts-default`) appears as `signalIndexName` and again in `selectedPatterns`.
   */
  const alertsAndSelectedPatterns = useMemo(
    () => [
      ...new Set(
        signalIndexName != null ? [signalIndexName, ...selectedPatterns] : selectedPatterns
      ),
    ],
    [selectedPatterns, signalIndexName]
  );

  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const back = useMemo(
    () => ({
      href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.dashboards }),
      label: DASHBOARDS,
    }),
    [getSecuritySolutionUrl]
  );

  const summaryFilters = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <DataViewPicker scope={PageScope.default} compressed={false} />
        </EuiFlexItem>
        {!isILMAvailable && startDate && endDate && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.DATE_PICKER_TOOLTIP}>
              <EuiSuperDatePicker
                start={startDate}
                end={endDate}
                onTimeChange={onTimeChange}
                showUpdateButton={false}
                isDisabled={true}
                data-test-subj="dataQualityDatePicker"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
    [isILMAvailable, startDate, endDate, onTimeChange]
  );

  const [lastChecked, setLastChecked] = useLocalStorage<string>({
    defaultValue: '',
    key: LOCAL_STORAGE_KEY,
  });

  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canUserCreateAndReadCases = useCallback(
    () => userCasesPermissions.createComment && userCasesPermissions.read,
    [userCasesPermissions.createComment, userCasesPermissions.read]
  );

  const createCaseFlyout = cases.hooks.useCasesAddToNewCaseFlyout({
    toastContent: i18n.ADD_TO_CASE_SUCCESS,
  });
  const openCreateCaseFlyout = useCallback(
    ({ comments, headerContent }: { comments: string[]; headerContent?: React.ReactNode }) => {
      const attachments = comments.map((x) => ({
        type: COMMENT_ATTACHMENT_TYPE,
        data: { content: x },
      }));

      createCaseFlyout.open({ attachments, headerContent });
    },
    [createCaseFlyout]
  );

  const reportDataQualityIndexChecked = useCallback(
    (params: ReportDataQualityIndexCheckedParams) => {
      telemetry.reportEvent(DataQualityEventTypes.DataQualityIndexChecked, params);
    },
    [telemetry]
  );

  const reportDataQualityCheckAllCompleted = useCallback(
    (params: ReportDataQualityCheckAllCompletedParams) => {
      telemetry.reportEvent(DataQualityEventTypes.DataQualityCheckAllCompleted, params);
    },
    [telemetry]
  );

  if (status === 'loading' || isSignalIndexNameLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="ecsDataQualityDashboardLoader" />;
  }

  if (status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="ecsDataQualityDashboardPage">
        {/* The header must be a direct child of the wrapper, otherwise it does not stay sticky. */}
        <SecurityAppHeader
          title={i18n.DATA_QUALITY_TITLE}
          description={{ text: i18n.DATA_QUALITY_DESCRIPTION, learnMoreUrl: ECS_REFERENCE_URL }}
          spacing="largeBleed"
          back={back}
          docLink={docLinks.links.siem.dataQualityPage}
          // Empty items still count as a menu, so the legacy data view picker is not remounted.
          menu={{ items: [] }}
        />
        <EuiSpacer size="m" />
        {indicesExist ? (
          <DataQualityPanel
            baseTheme={baseTheme}
            canUserCreateAndReadCases={canUserCreateAndReadCases}
            defaultBytesFormat={defaultBytesFormat}
            defaultNumberFormat={defaultNumberFormat}
            endDate={endDate}
            reportDataQualityCheckAllCompleted={reportDataQualityCheckAllCompleted}
            reportDataQualityIndexChecked={reportDataQualityIndexChecked}
            httpFetch={httpFetch}
            isAssistantEnabled={isAssistantEnabled}
            isILMAvailable={isILMAvailable}
            lastChecked={lastChecked}
            openCreateCaseFlyout={openCreateCaseFlyout}
            patterns={alertsAndSelectedPatterns}
            setLastChecked={setLastChecked}
            startDate={startDate}
            summaryFilters={summaryFilters}
            theme={theme}
            toasts={toasts}
            defaultStartTime={DEFAULT_START_TIME}
            defaultEndTime={DEFAULT_END_TIME}
          />
        ) : (
          <EmptyPrompt />
        )}
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.dataQuality} />
    </>
  );
};

DataQualityComponent.displayName = 'DataQualityComponent';

export const DataQuality = React.memo(DataQualityComponent);
