/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export function FacetOptionRow({
  checkboxId,
  label,
  count,
  isIncluded,
  isExcluded,
  onToggle,
  onExclude,
  testSubject,
  excludeTestSubject,
}: {
  checkboxId: string;
  label: string;
  count?: number;
  isIncluded: boolean;
  isExcluded: boolean;
  onToggle: () => void;
  onExclude: () => void;
  testSubject: string;
  excludeTestSubject: string;
}) {
  const { euiTheme } = useEuiTheme();
  const excludeAriaLabel = isExcluded
    ? i18n.translate('xpack.ux.filters.removeExcludeAriaLabel', {
        defaultMessage: 'Stop excluding {value}',
        values: { value: label },
      })
    : i18n.translate('xpack.ux.filters.excludeValueAriaLabel', {
        defaultMessage: 'Exclude {value}',
        values: { value: label },
      });

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      css={css`
        min-width: 0;
        min-height: ${euiTheme.size.l};
        padding: 0 ${euiTheme.size.xs};
        border-radius: ${euiTheme.border.radius.small};
        &:hover {
          background: ${euiTheme.colors.lightestShade};
        }
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiCheckbox
          id={checkboxId}
          checked={isIncluded}
          onChange={onToggle}
          aria-label={count != null ? `${label}, ${count.toLocaleString()}` : label}
          data-test-subj={testSubject}
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          min-width: 0;
        `}
      >
        <label htmlFor={checkboxId}>
          <EuiText
            size="s"
            className="eui-textTruncate"
            title={label}
            color={isExcluded ? 'danger' : undefined}
          >
            {label}
          </EuiText>
        </label>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={excludeAriaLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={isExcluded ? 'minusInCircleFilled' : 'minusInCircle'}
            color={isExcluded ? 'danger' : 'text'}
            size="xs"
            aria-label={excludeAriaLabel}
            onClick={onExclude}
            data-test-subj={excludeTestSubject}
          />
        </EuiToolTip>
      </EuiFlexItem>
      {count != null ? (
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              font-variant-numeric: tabular-nums;
            `}
          >
            {count.toLocaleString()}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
