/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { ComparedValue } from '../../../../common/types/applications';
import {
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
  MOBILE_APPLICATION_EBT_ELEMENTS,
} from '../../../ebt_constants';

export const NOT_ENOUGH_DATA_LABEL = i18n.translate(
  'xpack.digitalExperience.mobile.panel.notEnoughData',
  { defaultMessage: 'Not enough data' }
);

const DISCOVER_LABEL = i18n.translate('xpack.digitalExperience.mobile.panel.openInDiscover', {
  defaultMessage: 'Open in Discover',
});

/** The change of a value against the previous period, as a share of it; `null` when unknown. */
export const relativeChange = ({ value, previous }: ComparedValue): number | null =>
  value !== null && previous !== null && previous !== 0 ? (value - previous) / previous : null;

interface MobilePanelProps {
  title: string;
  /** How the value is calculated. */
  tooltip: string;
  value: ComparedValue | undefined;
  formatValue: (value: number) => string;
  /** The page-level Compare toggle: shows the previous period's value next to the current one. */
  isComparing: boolean;
  isLoading: boolean;
  /** Discover with the same ES|QL and filters, `undefined` when Discover isn't available. */
  discoverHref: string | undefined;
  'data-test-subj': string;
  children?: ReactNode;
}

/**
 * The panel every mobile panel uses: the current value with its change against the previous period,
 * the Compare overlay, a tooltip with how the value is calculated and a Discover link.
 */
export function MobilePanel({
  title,
  tooltip,
  value,
  formatValue,
  isComparing,
  isLoading,
  discoverHref,
  'data-test-subj': dataTestSubj,
  children,
}: MobilePanelProps) {
  const change = value ? relativeChange(value) : null;
  const renderValue = () => {
    if (isLoading) {
      return <EuiLoadingSpinner size="m" />;
    }
    if (!value || value.value === null) {
      return NOT_ENOUGH_DATA_LABEL;
    }
    return formatValue(value.value);
  };

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="question"
            content={tooltip}
            aria-label={tooltip}
            iconProps={{ 'data-test-subj': `${dataTestSubj}Tooltip` }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTitle size="m">
        <p data-test-subj={`${dataTestSubj}Value`}>{renderValue()}</p>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        {change !== null && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj={`${dataTestSubj}Change`}>
              {`${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}%`}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {isComparing && value && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj={`${dataTestSubj}Previous`}>
              {i18n.translate('xpack.digitalExperience.mobile.panel.previous', {
                defaultMessage: 'Previous period: {previous}',
                values: {
                  previous: value.previous === null ? '–' : formatValue(value.previous),
                },
              })}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {children}
      {discoverHref && (
        <>
          <EuiSpacer size="s" />
          <EuiLink
            href={discoverHref}
            target="_blank"
            data-test-subj={`${dataTestSubj}Discover`}
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_IN_DISCOVER,
              element: MOBILE_APPLICATION_EBT_ELEMENTS.PANEL_DISCOVER_LINK,
            })}
          >
            {DISCOVER_LABEL}
          </EuiLink>
        </>
      )}
    </EuiPanel>
  );
}
