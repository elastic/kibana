/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type { ComparedValue } from '../../common/types/applications';
import { KpiPanel } from './kpi_panel';
import { useFormatters } from '../hooks/use_formatters';
import { NOT_ENOUGH_DATA_LABEL } from '../labels';
import { formatChange } from '../utils/compared_value';
import type { FormattedChange } from '../utils/compared_value';
import type { ChangeUnit } from '../utils/compared_value';

export interface ComparedKpiPanelProps {
  title: string;
  /** How the value is calculated. */
  tooltip: string;
  value: ComparedValue | undefined;
  formatValue: (value: number) => string;
  changeUnit: ChangeUnit;
  /** Colours the change: green when it goes the better way, red otherwise; neutral when unset. */
  higherIsBetter?: boolean;
  /** Shown without a value; "Not enough data" unless set. */
  emptyLabel?: string;
  /** The page-level Compare toggle: shows the previous period's value next to the current one. */
  isComparing: boolean;
  isLoading: boolean;
  'data-test-subj': string;
}

/**
 * Neutral for a change that reads as none once rounded, so "0%" is never red or green, and for one
 * too small to call better or worse.
 */
const changeColor = (
  { direction, isNegligible }: FormattedChange,
  higherIsBetter: boolean | undefined
): EuiBadgeProps['color'] => {
  if (direction === 0 || isNegligible || higherIsBetter === undefined) {
    return 'hollow';
  }
  return direction > 0 === higherIsBetter ? 'success' : 'danger';
};

/** An arrow for the way the value went, so the change doesn't rely on its color alone. */
const changeIcon = ({ direction }: FormattedChange): EuiBadgeProps['iconType'] => {
  if (direction === 0) {
    return undefined;
  }
  return direction > 0 ? 'sortUp' : 'sortDown';
};

const ellipsisCss = css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });

const previousPeriodLabel = (previous: string) =>
  i18n.translate('xpack.digitalExperience.comparedKpiPanel.previous', {
    defaultMessage: 'Previous period: {previous}',
    values: { previous },
  });

/**
 * A KPI: the current value, a tooltip with how it's calculated and, with Compare on, its
 * change and value of the previous period.
 */
export function ComparedKpiPanel({
  title,
  tooltip,
  value,
  formatValue,
  changeUnit,
  higherIsBetter,
  emptyLabel = NOT_ENOUGH_DATA_LABEL,
  isComparing,
  isLoading,
  'data-test-subj': dataTestSubj,
}: ComparedKpiPanelProps) {
  const formatters = useFormatters();
  const change = value ? formatChange(value, changeUnit, formatters) : null;

  return (
    <KpiPanel
      data-test-subj={dataTestSubj}
      label={title}
      hint={tooltip}
      isLoading={isLoading}
      isEmpty={!value || value.value === null}
      value={
        <span data-test-subj={`${dataTestSubj}Value`}>
          {!value || value.value === null ? emptyLabel : formatValue(value.value)}
        </span>
      }
      change={
        isComparing && change !== null ? (
          <EuiBadge
            color={changeColor(change, higherIsBetter)}
            iconType={changeIcon(change)}
            data-test-subj={`${dataTestSubj}Change`}
          >
            {change.label}
          </EuiBadge>
        ) : undefined
      }
      previous={
        isComparing && value ? (
          // Short, so the panel keeps its height; the tooltip spells it out.
          value.previous === null ? (
            <EuiText
              size="xs"
              color="subdued"
              css={ellipsisCss}
              data-test-subj={`${dataTestSubj}Previous`}
            >
              <FormattedMessage
                id="xpack.digitalExperience.comparedKpiPanel.noPrevious"
                defaultMessage="vs {previous}"
                values={{ previous: <EmptyCellValue /> }}
              />
            </EuiText>
          ) : (
            <EuiToolTip content={previousPeriodLabel(formatValue(value.previous))}>
              <EuiText
                size="xs"
                color="subdued"
                css={ellipsisCss}
                tabIndex={0}
                data-test-subj={`${dataTestSubj}Previous`}
              >
                <FormattedMessage
                  id="xpack.digitalExperience.comparedKpiPanel.versus"
                  defaultMessage="vs {previous}"
                  values={{ previous: formatValue(value.previous) }}
                />
              </EuiText>
            </EuiToolTip>
          )
        ) : undefined
      }
    />
  );
}
