/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useCallback } from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import type { IconType, EuiButtonEmptyProps } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { TimeRange } from '../../store/inputs/model';
import type { DataProvider } from '../../../../common/types';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../detections/components/alerts_table/translations';
import { useTimelineApi } from '../../hooks/timeline/use_timeline_api';

export interface InvestigateInTimelineButtonProps {
  asEmptyButton: boolean;
  dataProviders: DataProvider[] | null;
  filters?: Filter[] | null;
  timeRange?: TimeRange;
  keepDataView?: boolean;
  isDisabled?: boolean;
  iconType?: IconType;
  children?: React.ReactNode;
  flush?: EuiButtonEmptyProps['flush'];
}

export const InvestigateInTimelineButton: FC<
  PropsWithChildren<InvestigateInTimelineButtonProps>
> = ({
  asEmptyButton,
  children,
  dataProviders,
  filters,
  timeRange,
  keepDataView,
  iconType,
  flush,
  ...rest
}) => {
  const { openTimeline } = useTimelineApi();
  const openTimelineCallback = useCallback(() => {
    openTimeline({
      dataProviders,
      filters,
      timeRange,
      keepDataView,
    });
  }, [dataProviders, filters, timeRange, keepDataView, openTimeline]);

  return asEmptyButton ? (
    <EuiButtonEmpty
      aria-label={ACTION_INVESTIGATE_IN_TIMELINE}
      onClick={openTimelineCallback}
      flush={flush ?? 'right'}
      size="xs"
      iconType={iconType}
    >
      {children}
    </EuiButtonEmpty>
  ) : (
    <EuiButton aria-label={ACTION_INVESTIGATE_IN_TIMELINE} onClick={openTimelineCallback} {...rest}>
      {children}
    </EuiButton>
  );
};

InvestigateInTimelineButton.displayName = 'InvestigateInTimelineButton';
