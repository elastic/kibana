/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';

import type { ParsedField } from '../../types';
import { chipLabelCss, inlineFieldWrapperCss, wrappedChipLabelCss } from '../styles';
import { useIsChipLabelTruncated } from '../use_is_chip_label_truncated';

interface Props extends ParsedField {
  wrapFieldValues?: boolean;
}

/**
 * A non-interactive field chip. It uses no Security app providers (flyouts, cell actions), so it
 * also renders outside the Security app, e.g. in Agent Builder conversations.
 */
export const DisabledFieldMarkdownRenderer = ({
  icon,
  name,
  value,
  wrapFieldValues = false,
}: Props) => {
  // A wrapped label never clips, so it needs no measurement and no full-value tooltip.
  const { chipLabelRef, isValueTruncated } = useIsChipLabelTruncated(value, !wrapFieldValues);

  return (
    <span css={inlineFieldWrapperCss} data-test-subj="fieldMarkdownRendererInlineWrapper">
      <EuiToolTip
        content={isValueTruncated ? `${name}: ${value}` : name}
        data-test-subj="fieldMarkdownRendererToolTip"
        position="top"
      >
        <EuiBadge color="hollow" data-test-subj="disabledActionsBadge" iconType={icon} tabIndex={0}>
          <span
            css={wrapFieldValues ? wrappedChipLabelCss : chipLabelCss}
            data-test-subj="disabledChipLabel"
            ref={chipLabelRef}
          >
            {value}
          </span>
        </EuiBadge>
      </EuiToolTip>
    </span>
  );
};
