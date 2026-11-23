/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type { ComparedValue } from '../../../../common/types/applications';
import { KpiPanel } from '../../../components/kpi_panel';
import { useFormatters } from '../../../hooks/use_formatters';
import { NOT_ENOUGH_DATA_LABEL } from '../../../labels';
import { formatChange } from '../../../utils/compared_value';
import type { ChangeDirection } from '../../../utils/compared_value';
import type { ChangeUnit } from '../../../utils/compared_value';

export interface MobilePanelProps {
  title: string;
  /** How the value is calculated. */
  tooltip: string;
  value: ComparedValue | undefined;
  formatValue: (value: number) => string;
  changeUnit: ChangeUnit;
  /** Colours the change: green when it goes the better way, red otherwise; neutral when unset. */
  higherIsBetter?: boolean;
  /** The page-level Compare toggle: shows the previous period's value next to the current one. */
  isComparing: boolean;
  isLoading: boolean;
  'data-test-subj': string;
}

/** Neutral for a change that reads as none once rounded, so "0%" is never red or green. */
const changeColor = (
  direction: ChangeDirection,
  higherIsBetter: boolean | undefined
): EuiBadgeProps['color'] => {
  if (direction === 0 || higherIsBetter === undefined) {
    return 'hollow';
  }
  return direction > 0 === higherIsBetter ? 'success' : 'danger';
};

/**
 * A mobile KPI: the current value, a tooltip with how it's calculated and, with Compare on, its
 * change and value of the previous period.
 */
export function MobilePanel({
  title,
  tooltip,
  value,
  formatValue,
  changeUnit,
  higherIsBetter,
  isComparing,
  isLoading,
  'data-test-subj': dataTestSubj,
}: MobilePanelProps) {
  const formatters = useFormatters();
  const change = value ? formatChange(value, changeUnit, formatters) : null;

  return (
    <KpiPanel
      data-test-subj={dataTestSubj}
      label={title}
      hint={tooltip}
      isLoading={isLoading}
      value={
        <span data-test-subj={`${dataTestSubj}Value`}>
          {!value || value.value === null ? NOT_ENOUGH_DATA_LABEL : formatValue(value.value)}
        </span>
      }
      footer={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          {isComparing && change !== null && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={changeColor(change.direction, higherIsBetter)}
                data-test-subj={`${dataTestSubj}Change`}
              >
                {change.label}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {isComparing && value && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj={`${dataTestSubj}Previous`}>
                <FormattedMessage
                  id="xpack.digitalExperience.mobile.panel.previous"
                  defaultMessage="Previous period: {previous}"
                  values={{
                    previous:
                      value.previous === null ? <EmptyCellValue /> : formatValue(value.previous),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    />
  );
}
