/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertDetailsAppSectionProps, type TopAlert } from '@kbn/observability-plugin/public';
import { PanelWithTitle } from '../../common/components/panel_with_title';
import { useErrorFailedTests } from '../../error_details/hooks/use_error_failed_tests';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';
import { useDateFormat } from '../../../../../hooks/use_date_format';
import { useErrorDetailsBreadcrumbs } from '../../error_details/hooks/use_error_details_breadcrumbs';
import { useStepDetails } from '../../error_details/hooks/use_step_details';
import { TIMELINE_LABEL } from '../../error_details/error_details_page';
import { ErrorTimeline } from '../../error_details/components/error_timeline';

export const StatusAlertDetail = ({
  alert,
}: AlertDetailsAppSectionProps & {
  alert: TopAlert;
}) => {
  const configId = alert.fields?.configId;
  const errorStateId = alert.fields?.['monitor.state.id'];
  const { failedTests, loading } = useErrorFailedTests({
    configId,
    errorStateId,
  });
  console.log(alert);

  const checkGroupId = failedTests?.[0]?.monitor.check_group ?? '';

  const { data, isFailedStep, failedStep, loading: stepsLoading } = useJourneySteps(checkGroupId);

  const lastTestRun = failedTests?.[0];

  const formatter = useDateFormat();
  const startedAt = formatter(lastTestRun?.state?.started_at);

  useErrorDetailsBreadcrumbs([{ text: startedAt }]);

  const stepDetails = useStepDetails({ checkGroup: lastTestRun?.monitor.check_group });

  const isBrowser = data?.details?.journey.monitor.type === 'browser';
  return (
    <>
      <PanelWithTitle title={TIMELINE_LABEL}>
        <ErrorTimeline lastTestRun={lastTestRun} errorStateId={errorStateId} />
      </PanelWithTitle>
    </>
  );
};
