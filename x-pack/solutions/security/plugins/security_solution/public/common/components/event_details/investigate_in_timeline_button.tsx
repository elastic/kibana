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
import { useDispatch, useSelector } from 'react-redux';

import { sourcererSelectors } from '../../store';
import { InputsModelId } from '../../store/inputs/constants';
import type { TimeRange } from '../../store/inputs/model';
import { inputsActions } from '../../store/inputs';
import { updateProviders, setFilters } from '../../../timelines/store/actions';
import { sourcererActions } from '../../store/actions';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import type { DataProvider } from '../../../../common/types';
import { TimelineId } from '../../../../common/types/timeline';
import { TimelineTypeEnum } from '../../../../common/api/timeline';
import { useCreateTimeline } from '../../../timelines/hooks/use_create_timeline';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../detections/components/alerts_table/translations';

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
  const dispatch = useDispatch();

  const signalIndexName = useSelector(sourcererSelectors.signalIndexName);
  const defaultDataView = useSelector(sourcererSelectors.defaultDataView);

  const hasTemplateProviders =
    dataProviders && dataProviders.find((provider) => provider.type === 'template');

  const clearTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: hasTemplateProviders ? TimelineTypeEnum.template : TimelineTypeEnum.default,
  });

  const configureAndOpenTimeline = useCallback(async () => {
    if (dataProviders || filters) {
      // Reset the current timeline
      if (timeRange) {
        await clearTimeline({
          timeRange,
        });
      } else {
        await clearTimeline();
      }
      if (dataProviders) {
        // Update the timeline's providers to match the current prevalence field query
        dispatch(
          updateProviders({
            id: TimelineId.active,
            providers: dataProviders,
          })
        );
      }
      // Use filters if more than a certain amount of ids for dom performance.
      if (filters) {
        dispatch(
          setFilters({
            id: TimelineId.active,
            filters,
          })
        );
      }
      // Only show detection alerts
      // (This is required so the timeline event count matches the prevalence count)
      if (!keepDataView) {
        dispatch(
          sourcererActions.setSelectedDataView({
            id: SourcererScopeName.timeline,
            selectedDataViewId: defaultDataView.id,
            selectedPatterns: [signalIndexName || ''],
          })
        );
      }
      // Unlock the time range from the global time range
      dispatch(inputsActions.removeLinkTo([InputsModelId.timeline, InputsModelId.global]));
    }
  }, [
    dataProviders,
    clearTimeline,
    dispatch,
    defaultDataView.id,
    signalIndexName,
    filters,
    timeRange,
    keepDataView,
  ]);

  return asEmptyButton ? (
    <EuiButtonEmpty
      aria-label={ACTION_INVESTIGATE_IN_TIMELINE}
      onClick={configureAndOpenTimeline}
      flush={flush ?? 'right'}
      size="xs"
      iconType={iconType}
    >
      {children}
    </EuiButtonEmpty>
  ) : (
    <EuiButton
      aria-label={ACTION_INVESTIGATE_IN_TIMELINE}
      onClick={configureAndOpenTimeline}
      {...rest}
    >
      {children}
    </EuiButton>
  );
};

InvestigateInTimelineButton.displayName = 'InvestigateInTimelineButton';
