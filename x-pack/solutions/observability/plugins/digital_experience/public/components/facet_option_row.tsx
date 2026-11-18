/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../ebt_constants';

/**
 * One value of a facet, with a checkbox to include it, a button to exclude it, and its count. The
 * checkbox and the button each undo themselves when pressed again.
 */
export function FacetOptionRow({
  id,
  label,
  count,
  isIncluded,
  isExcluded,
  isDisabled = false,
  onInclude,
  onExclude,
  ebtElement,
  'data-test-subj': dataTestSubj,
}: {
  /** Unique on the page; ties the label to the checkbox. */
  id: string;
  label: string;
  /** Formatted for display, `undefined` for a selected value that has no count in the range. */
  count?: string;
  isIncluded: boolean;
  isExcluded: boolean;
  /** Neither includes nor excludes it, e.g. for a value past the filter's cap. */
  isDisabled?: boolean;
  onInclude: () => void;
  onExclude: () => void;
  /** Names the filter in click telemetry. */
  ebtElement: string;
  /** Prefix of the checkbox's test subject; the exclude button's ends in `-exclude`. */
  'data-test-subj': string;
}) {
  const { euiTheme } = useEuiTheme();
  const excludeLabel = isExcluded
    ? i18n.translate('xpack.digitalExperience.facetOption.stopExcludingLabel', {
        defaultMessage: 'Stop excluding {value}',
        values: { value: label },
      })
    : i18n.translate('xpack.digitalExperience.facetOption.excludeLabel', {
        defaultMessage: 'Exclude {value}',
        values: { value: label },
      });

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      css={css({
        minInlineSize: 0,
        paddingInline: euiTheme.size.s,
        minBlockSize: euiTheme.size.xl,
        '&:hover': { backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover },
      })}
    >
      <EuiFlexItem grow css={css({ minInlineSize: 0 })}>
        <EuiCheckbox
          id={id}
          checked={isIncluded}
          disabled={isDisabled}
          onChange={onInclude}
          // The label takes the rest of the row, count included, so a click anywhere on it toggles
          // the value instead of only a click on the text.
          labelProps={{ css: css({ flexGrow: 1, minInlineSize: 0 }) }}
          label={
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow css={css({ minInlineSize: 0 })}>
                <EuiText
                  size="s"
                  color={isExcluded ? 'danger' : undefined}
                  css={css({ textDecoration: isExcluded ? 'line-through' : undefined })}
                  title={label}
                >
                  <span className="eui-textTruncate">{label}</span>
                </EuiText>
              </EuiFlexItem>
              {count !== undefined && (
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    css={css({ fontVariantNumeric: 'tabular-nums' })}
                  >
                    {count}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
          data-test-subj={dataTestSubj}
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
            element: ebtElement,
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={excludeLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="minusCircle"
            color={isExcluded ? 'danger' : 'text'}
            display={isExcluded ? 'fill' : 'empty'}
            size="xs"
            aria-label={excludeLabel}
            aria-pressed={isExcluded}
            isDisabled={isDisabled}
            onClick={onExclude}
            data-test-subj={`${dataTestSubj}-exclude`}
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.EXCLUDE_FILTER_VALUE,
              element: ebtElement,
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
