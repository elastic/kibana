/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { CertFacetCount } from '../../../../../common/runtime_types';
import { EXPIRY_BUCKET_OPTIONS } from './cert_filter_options';
import * as labels from './translations';

interface Props {
  // Global distinct-cert counts per expiry window, from the facets endpoint.
  counts?: CertFacetCount[];
  // Active `expiringWithin` filter value, if any.
  selected?: string;
  onSelect: (value?: string) => void;
}

// Clickable, color-coded summary of how many certificates fall into each
// cumulative expiry window (Expired → ≤30 days). Each item toggles the
// `expiringWithin` filter, and its count equals what clicking it narrows the
// table to (counts include already-expired certs).
export const CertStats: React.FC<Props> = ({ counts, selected, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  const countByValue = new Map((counts ?? []).map(({ value, count }) => [value, count]));

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      responsive={false}
      wrap
      aria-label={labels.EXPIRY_SUMMARY_ARIA}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <strong>{labels.EXPIRY_SUMMARY_LABEL}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xl" alignItems="center" responsive={false} wrap>
          {EXPIRY_BUCKET_OPTIONS.map(({ value, label, color }) => {
            const isSelected = selected === value;
            const count = countByValue.get(value) ?? 0;
            // Empty buckets carry no certs to show, so they are non-interactive
            // (unless one is the active filter, which must stay clickable to clear).
            const isDisabled = count === 0 && !isSelected;
            const selectedBg = isSelected ? euiTheme.colors.lightShade : 'transparent';
            const tooltip = isSelected
              ? labels.EXPIRY_CLEAR_FILTER_TOOLTIP
              : labels.EXPIRY_FILTER_TOOLTIP;
            return (
              <EuiFlexItem grow={false} key={value}>
                <EuiToolTip content={tooltip} position="top">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={label}
                    disabled={isDisabled}
                    onClick={() => onSelect(isSelected ? undefined : value)}
                    data-test-subj={`certExpiryBucket-${value}`}
                    css={css`
                      cursor: ${isDisabled ? 'default' : 'pointer'};
                      border: none;
                      border-radius: ${euiTheme.border.radius.medium};
                      padding: ${euiTheme.size.xxs} ${euiTheme.size.s};
                      background-color: ${selectedBg};
                      opacity: ${isDisabled ? 0.5 : 1};
                      transition: background-color ${euiTheme.animation.fast} ease-in;
                      &:hover,
                      &:focus {
                        background-color: ${isDisabled
                          ? selectedBg
                          : isSelected
                          ? euiTheme.colors.lightShade
                          : euiTheme.colors.lightestShade};
                      }
                    `}
                  >
                    <EuiHealth color={isDisabled ? 'subdued' : color}>
                      <EuiText size="s" component="span" color={isSelected ? 'default' : 'subdued'}>
                        {label} - <strong>{count}</strong>
                      </EuiText>
                    </EuiHealth>
                  </button>
                </EuiToolTip>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
