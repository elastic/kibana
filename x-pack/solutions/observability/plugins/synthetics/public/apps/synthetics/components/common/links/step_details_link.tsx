/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { CommonProps } from '@elastic/eui/src/components/common';

import { useSyntheticsSettingsContext } from '../../../contexts';
import { useSelectedLocation } from '../../monitor_details/hooks/use_selected_location';
import { useGetUrlParams } from '../../../hooks';
import { useUrlSpaceId } from '../../../hooks/use_url_space_id';
import { getStepDetailLink } from '../../step_details_page/hooks/use_step_detail_page';

export const StepDetailsLinkIcon = ({
  stepIndex,
  checkGroup,
  configId,
  asButton,
  label,
  target = '_self',
  ...commonProps
}: CommonProps & {
  checkGroup: string;
  label?: string;
  configId: string;
  stepIndex?: number;
  asButton?: boolean;
  target?: '_self' | '_blank';
}) => {
  const { basePath } = useSyntheticsSettingsContext();
  const selectedLocation = useSelectedLocation({ refetchMonitorEnabled: false });
  const spaceId = useUrlSpaceId();
  const { remoteName } = useGetUrlParams();

  const stepDetailsLink = getStepDetailLink({
    basePath,
    monitorId: configId,
    checkGroupId: checkGroup,
    stepIndex: stepIndex ?? 1,
    locationId: selectedLocation?.id,
    spaceId,
    remoteName,
  });

  if (asButton) {
    return (
      <EuiButtonEmpty
        data-test-subj="syntheticsStepDetailsLinkIconButton"
        {...commonProps}
        flush="left"
        iconType="chartWaterfall"
        href={stepDetailsLink}
      >
        {/* @ts-expect-error Type '(stepIndex?: number) => string' is not assignable to type 'ReactNode'.*/}
        {label ?? VIEW_DETAILS}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={VIEW_DETAILS(stepIndex)}>
      <EuiButtonIcon
        data-test-subj="syntheticsStepDetailsLinkIconButton"
        {...commonProps}
        size="s"
        href={stepDetailsLink}
        target={target}
        iconType="chartWaterfall"
      />
    </EuiToolTip>
  );
};

const VIEW_DETAILS = (stepIndex: number = 1) =>
  i18n.translate('xpack.synthetics.monitor.step.viewStepDetails', {
    defaultMessage: 'View step {stepIndex} details',
    values: {
      stepIndex,
    },
  });
