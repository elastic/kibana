/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeProps, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  rollingTimeWindowTypeSchema,
  SLODefinitionResponse,
  SLOWithSummaryResponse,
} from '@kbn/slo-schema';
import { euiLightVars } from '@kbn/ui-theme';
import moment from 'moment';
import React, { MouseEvent, useCallback } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { SLOS_PATH } from '../../../../../common/locators/paths';
import { toCalendarAlignedMomentUnitOfTime } from '../../../../utils/slo/duration';
import { toDurationLabel } from '../../../../utils/slo/labels';
import { useUrlSearchState } from '../../hooks/use_url_search_state';

export interface Props {
  color?: EuiBadgeProps['color'];
  slo: SLOWithSummaryResponse | SLODefinitionResponse;
}

export function SloTimeWindowBadge({ slo, color }: Props) {
  const { onStateChange } = useUrlSearchState();
  const isSloPage = useRouteMatch(SLOS_PATH)?.isExact ?? false;

  const onBadgeClick = useCallback(() => {
    if (isSloPage)
      onStateChange({
        kqlQuery: `slo.timeWindow.duration: "${slo.timeWindow.duration}"`,
      });
  }, [isSloPage, onStateChange, slo.timeWindow.duration]);

  const unit = slo.timeWindow.duration.slice(-1);
  if (rollingTimeWindowTypeSchema.is(slo.timeWindow.type)) {
    return (
      <EuiFlexItem grow={false}>
        <EuiBadge
          onClick={onBadgeClick}
          onClickAriaLabel={i18n.translate('xpack.slo.timeWindowBadge.clickToFilter', {
            defaultMessage: 'Click to filter by {timeWindow} SLOs',
            values: { timeWindow: toDurationLabel(slo.timeWindow.duration) },
          })}
          color={color ?? euiLightVars.euiColorDisabled}
          iconType="editorItemAlignRight"
          iconSide="left"
          onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
            if (isSloPage) e.stopPropagation(); // stops propagation of metric onElementClick
          }}
        >
          {toDurationLabel(slo.timeWindow.duration)}
        </EuiBadge>
      </EuiFlexItem>
    );
  }

  const unitMoment = toCalendarAlignedMomentUnitOfTime(unit);
  const now = moment.utc();

  const periodStart = now.clone().startOf(unitMoment);
  const periodEnd = now.clone().endOf(unitMoment);

  const totalDurationInDays = periodEnd.diff(periodStart, 'days') + 1;
  const elapsedDurationInDays = now.diff(periodStart, 'days') + 1;

  return (
    <EuiFlexItem grow={false}>
      <EuiBadge color={color ?? euiLightVars.euiColorDisabled} iconType="calendar" iconSide="left">
        {i18n.translate('xpack.slo.slo.timeWindow.calendar', {
          defaultMessage: '{elapsed}/{total} days',
          values: {
            elapsed: Math.min(elapsedDurationInDays, totalDurationInDays),
            total: totalDurationInDays,
          },
        })}
      </EuiBadge>
    </EuiFlexItem>
  );
}
