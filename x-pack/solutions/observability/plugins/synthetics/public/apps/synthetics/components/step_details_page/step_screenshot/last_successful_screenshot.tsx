/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { fetchLastSuccessfulCheck } from '../../../state';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { JourneyStepScreenshotContainer } from '../../common/screenshot/journey_step_screenshot_container';
import { ScreenshotImageSize } from '../../common/screenshot/screenshot_size';

export const LastSuccessfulScreenshot = ({
  step,
  stepIndex: stepInd,
  size,
  borderRadius,
}: {
  step: JourneyStep;
  stepIndex?: number;
  size: ScreenshotImageSize;
  borderRadius?: string | number;
}) => {
  const { stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();

  const { data, loading } = useFetcher(() => {
    return fetchLastSuccessfulCheck({
      timestamp: step['@timestamp'],
      monitorId: step.monitor.id,
      stepIndex: Number(stepIndex ?? stepInd),
      location: step.observer?.geo?.name,
    });
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Synthetics folks can fix it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step._id, step['@timestamp']]);

  return (
    <>
      <JourneyStepScreenshotContainer
        checkGroup={data?.monitor.check_group}
        initialStepNumber={data?.synthetics?.step?.index}
        stepStatus={data?.synthetics?.payload?.status}
        allStepsLoaded={!loading}
        retryFetchOnRevisit={false}
        size={size}
        unavailableMessage={IMAGE_UN_AVAILABLE}
        borderRadius={borderRadius}
      />
      <EuiSpacer size="xs" />
    </>
  );
};

export const IMAGE_UN_AVAILABLE = i18n.translate(
  'xpack.synthetics.monitor.step.screenshot.unAvailable',
  {
    defaultMessage: 'Image unavailable',
  }
);
