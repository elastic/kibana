/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiText, useEuiTheme } from '@elastic/eui';
import moment from 'moment';

import { useRiskEngineStatus } from '../../api/hooks/use_risk_engine_status';
import { useScheduleNowRiskEngineMutation } from '../../api/hooks/use_schedule_now_risk_engine_mutation';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from '../../translations';
import { getEntityAnalyticsRiskScorePageStyles } from './risk_score_page_styles';

const TEN_SECONDS = 10000;

const formatTimeFromNow = (time: string | undefined): string => {
  if (!time) {
    return '';
  }
  return i18n.RISK_ENGINE_NEXT_RUN_TIME(moment(time).fromNow(true));
};

interface RunRiskEngineButtonProps {
  canRunEngine: boolean;
}

export const RunRiskEngineButton: React.FC<RunRiskEngineButtonProps> = ({ canRunEngine }) => {
  const { euiTheme } = useEuiTheme();
  const styles = getEntityAnalyticsRiskScorePageStyles(euiTheme);

  const { data: riskEngineStatus } = useRiskEngineStatus({
    refetchInterval: TEN_SECONDS,
    structuralSharing: false,
  });

  const currentRiskEngineStatus = riskEngineStatus?.risk_engine_status;
  const runEngineEnabled = currentRiskEngineStatus === 'ENABLED';

  const [isLoadingRunRiskEngine, setIsLoadingRunRiskEngine] = useState(false);
  const { mutateAsync: scheduleNowRiskEngine } = useScheduleNowRiskEngineMutation();
  const { addSuccess, addError } = useAppToasts();

  const { status, runAt } = riskEngineStatus?.risk_engine_task_status || {};
  const isRunning = status === 'running' || (!!runAt && new Date(runAt) < new Date());
  const runEngineBtnIsDisabled =
    !currentRiskEngineStatus || isLoadingRunRiskEngine || !canRunEngine || isRunning;

  const countDownText = isRunning
    ? 'Now running'
    : formatTimeFromNow(riskEngineStatus?.risk_engine_task_status?.runAt);

  const handleRunEngineClick = async () => {
    setIsLoadingRunRiskEngine(true);
    try {
      await scheduleNowRiskEngine();
      addSuccess(i18n.RISK_SCORE_ENGINE_RUN_SUCCESS, { toastLifeTimeMs: 5000 });
    } catch (error) {
      addError(error, { title: i18n.RISK_SCORE_ENGINE_RUN_FAILURE });
    } finally {
      setIsLoadingRunRiskEngine(false);
    }
  };

  if (!runEngineEnabled) {
    return null;
  }

  return (
    <>
      <EuiButton
        size="s"
        iconType="play"
        disabled={runEngineBtnIsDisabled}
        isLoading={isLoadingRunRiskEngine}
        onClick={handleRunEngineClick}
      >
        {i18n.RUN_RISK_SCORE_ENGINE}
      </EuiButton>
      <styles.VerticalSeparator />
      <div>
        <EuiText size="s" color="subdued">
          {countDownText}
        </EuiText>
      </div>
    </>
  );
};
