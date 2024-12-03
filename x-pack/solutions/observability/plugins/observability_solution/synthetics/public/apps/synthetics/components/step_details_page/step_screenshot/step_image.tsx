/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonGroup, EuiSpacer, EuiTitle, useEuiTheme, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { JourneyStepScreenshotContainer } from '../../common/screenshot/journey_step_screenshot_container';
import { LastSuccessfulScreenshot } from './last_successful_screenshot';

export const StepImage = ({
  step,
  ping,
  isFailed,
}: {
  ping: JourneyStep;
  step: JourneyStep;
  isFailed?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const toggleButtons = [
    {
      id: `received`,
      label: RECEIVED_LABEL,
    },
    {
      id: `expected`,
      label: EXPECTED_LABEL,
    },
  ];

  const [idSelected, setIdSelected] = useState(`received`);

  const onChangeDisabled = (optionId: string) => {
    setIdSelected(optionId);
  };

  return (
    <>
      <EuiTitle size="xs">
        <h3>{SCREENSHOT_LABEL}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPanel
        color="subdued"
        css={{
          outline: 0,
          height: '192px',
          borderRadius: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {idSelected === 'received' ? (
          <JourneyStepScreenshotContainer
            checkGroup={step?.monitor.check_group}
            initialStepNumber={step?.synthetics?.step?.index}
            stepStatus={step?.synthetics.payload?.status}
            allStepsLoaded={true}
            retryFetchOnRevisit={false}
            size={[260, 160]}
            borderRadius={euiTheme.border.radius.small}
            timestamp={step?.['@timestamp']}
          />
        ) : (
          <LastSuccessfulScreenshot
            step={ping}
            stepIndex={step?.synthetics?.step?.index}
            size={[260, 160]}
            borderRadius={euiTheme.border.radius.small}
          />
        )}
      </EuiPanel>
      <EuiSpacer size="m" />
      {isFailed && (
        <EuiButtonGroup
          legend=""
          options={toggleButtons}
          idSelected={idSelected}
          onChange={(id) => onChangeDisabled(id)}
          buttonSize="s"
          isFullWidth
        />
      )}
    </>
  );
};

const SCREENSHOT_LABEL = i18n.translate('xpack.synthetics.stepDetails.screenshot', {
  defaultMessage: 'Screenshot',
});

const EXPECTED_LABEL = i18n.translate('xpack.synthetics.stepDetails.expected', {
  defaultMessage: 'Expected',
});

const RECEIVED_LABEL = i18n.translate('xpack.synthetics.stepDetails.received', {
  defaultMessage: 'Received',
});
