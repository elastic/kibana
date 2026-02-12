/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/cases-plugin/common';
import {
  DATA_QUALITY_SUBTITLE,
  DataQualityPanel,
  ECS_REFERENCE_URL,
} from '@kbn/ecs-data-quality-dashboard';
import type { OnTimeChangeProps } from '@elastic/eui';
import { EuiLink, EuiLoadingSpinner, EuiSuperDatePicker, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAssistantAvailability } from '../../assistant/use_assistant_availability';
import { SecurityPageName } from '../../app/types';
import { useThemes } from '../../common/components/charts/common';
import { HeaderPage } from '../../common/components/header_page';
import { EmptyPrompt } from '../../common/components/empty_prompt';
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
  const selectedPatterns = useSelectedPatterns();

  const indicesExist = !!dataView?.matchedIndices?.length;

  const { signalIndexName, loading: isSignalIndexNameLoading } = useSignalIndex();
  const { configSettings, cases, telemetry } = useKibana().services;
  const isILMAvailable = configSettings.ILMEnabled;

  const [startDate, setStartTime] = useState<string>();
  const [endDate, setEndTime] = useState<string>();
  const onTimeChange = ({ start, end, isInvalid }: OnTimeChangeProps) => {
    if (isInvalid) {
      return;
    }

    setStartTime(start);
    setEndTime(end);
  };

  useEffect(() => {
    if (!isILMAvailable) {
      setStartTime(DEFAULT_START_TIME);
      setEndTime(DEFAULT_END_TIME);
    }
  }, [isILMAvailable]);

  const alertsAndSelectedPatterns = useMemo(
    () =>
      signalIndexName != null ? [signalIndexName, ...selectedPatterns] : [...selectedPatterns],
    [selectedPatterns, signalIndexName]
  );

  const subtitle = useMemo(
    () => (
      <EuiText color="subdued" size="s">
        <span>{DATA_QUALITY_SUBTITLE}</span>{' '}
        <EuiLink external={true} href={ECS_REFERENCE_URL} rel="noopener noreferrer" target="_blank">
          {i18n.ELASTIC_COMMON_SCHEMA}
        </EuiLink>
      </EuiText>
    ),
    []
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
      const attachments: Array<{
        comment: string;
        type: AttachmentType.user;
      }> = comments.map((x) => ({
        comment: x,
        type: AttachmentType.user,
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
      {indicesExist ? (
        <SecuritySolutionPageWrapper data-test-subj="ecsDataQualityDashboardPage">
          <HeaderPage subtitle={subtitle} title={i18n.DATA_QUALITY_TITLE}>
            {!isILMAvailable && startDate && endDate && (
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
            )}
          </HeaderPage>

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
            theme={theme}
            toasts={toasts}
            defaultStartTime={DEFAULT_START_TIME}
            defaultEndTime={DEFAULT_END_TIME}
          />
        </SecuritySolutionPageWrapper>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.dataQuality} />
    </>
  );
};

DataQualityComponent.displayName = 'DataQualityComponent';

export const DataQuality = React.memo(DataQualityComponent);
