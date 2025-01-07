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
import { useUserPrivileges } from '../user_privileges';
import { useInvestigateInTimeline } from '../../hooks/timeline/use_investigate_in_timeline';

export interface InvestigateInTimelineButtonProps {
  asEmptyButton: boolean;
  /**
   * The data providers to apply to the timeline.
   */
  dataProviders: DataProvider[] | null;
  /**
   * The filters to apply to the timeline.
   */
  filters?: Filter[] | null;
  /**
   * The time range to apply to the timeline, defaults to global time range.
   */
  timeRange?: TimeRange;
  /**
   * Whether to keep the current data view or reset it to the default.
   */
  keepDataView?: boolean;
  isDisabled?: boolean;
  iconType?: IconType;
  children?: React.ReactNode;
  flush?: EuiButtonEmptyProps['flush'];
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Component that renders a EuiEmptyButton or a normal EuiButton to wrap some content and attaches a
 * investigate in timeline callback to the click event.
 */
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
  isDisabled,
  'data-test-subj': dataTestSubj,
  ...rest
}) => {
  const { investigateInTimeline } = useInvestigateInTimeline();
  const openTimelineCallback = useCallback(() => {
    investigateInTimeline({
      dataProviders,
      filters,
      timeRange,
      keepDataView,
    });
  }, [dataProviders, filters, timeRange, keepDataView, investigateInTimeline]);
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();

  const disabled = !canUseTimeline || isDisabled;

  return asEmptyButton ? (
    <EuiButtonEmpty
      aria-label={ACTION_INVESTIGATE_IN_TIMELINE}
      onClick={openTimelineCallback}
      flush={flush ?? 'right'}
      size="xs"
      iconType={iconType}
      disabled={disabled}
      data-test-subj={dataTestSubj}
    >
      {children}
    </EuiButtonEmpty>
  ) : (
    <EuiButton
      aria-label={ACTION_INVESTIGATE_IN_TIMELINE}
      disabled={disabled}
      onClick={openTimelineCallback}
      data-test-subj={dataTestSubj}
      {...rest}
    >
      {children}
    </EuiButton>
  );
};

InvestigateInTimelineButton.displayName = 'InvestigateInTimelineButton';
