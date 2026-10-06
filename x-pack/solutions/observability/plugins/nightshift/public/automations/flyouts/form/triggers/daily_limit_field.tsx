/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFieldNumber,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { Sentence } from './pills/sentence';
import { triggerLabels } from './translations';
import { isValidDailyLimit } from '../validation';

export const DailyLimitField = ({
  value,
  helpText,
  onChange,
  readOnly = false,
}: {
  value: string;
  helpText: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={!readOnly && { paddingInline: euiTheme.size.s, paddingBlockEnd: euiTheme.size.s }}>
      <EuiHorizontalRule margin="s" />
      {readOnly && <EuiSpacer size="xs" />}
      <Sentence>
        <EuiText size="s">
          <strong>{triggerLabels.dailyLimit}</strong>
        </EuiText>
        {readOnly ? (
          <EuiBadge
            data-test-subj="automationDailyLimit"
            css={{ marginInlineStart: euiTheme.size.xs }}
          >
            {value} {triggerLabels.perDay}
          </EuiBadge>
        ) : (
          <div css={{ width: 180 }}>
            <EuiFieldNumber
              compressed
              aria-label={triggerLabels.dailyLimit}
              min={1}
              max={200}
              step={1}
              value={value}
              isInvalid={!isValidDailyLimit(value)}
              append={triggerLabels.perDay}
              onChange={(event) => onChange(event.target.value)}
              fullWidth
              data-test-subj="automationDailyLimit"
            />
          </div>
        )}
        {!readOnly && <EuiBadge color="success">{triggerLabels.recommended}</EuiBadge>}
      </Sentence>
      <EuiSpacer size={readOnly ? 'xs' : 's'} />
      <EuiText size="s" color="subdued">
        {helpText}
      </EuiText>
    </div>
  );
};
