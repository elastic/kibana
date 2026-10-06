/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFieldNumber,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { Sentence } from './pills/sentence';
import { triggerLabels } from './translations';
import { isValidDailyLimit } from '../validation';

const MAX_DAILY_LIMIT = 200;

const suggestRaisedLimit = (used: number, limit: number) =>
  Math.min(MAX_DAILY_LIMIT, Math.max(limit + 1, Math.ceil((Math.max(used, limit) * 1.5) / 5) * 5));

export const DailyLimitField = ({
  value,
  helpText,
  onChange,
  usedToday,
  readOnly = false,
}: {
  value: string;
  helpText: string;
  onChange: (value: string) => void;
  usedToday?: number;
  readOnly?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const limit = Number(value);
  const isLimitReached = usedToday !== undefined && limit > 0 && usedToday >= limit;
  const raisedLimit = isLimitReached ? suggestRaisedLimit(usedToday, limit) : limit;
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
              max={MAX_DAILY_LIMIT}
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
      {isLimitReached && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount={false}
            size="s"
            color="warning"
            iconType="hourglass"
            title={triggerLabels.dailyLimitReached}
            text={triggerLabels.getDailyLimitReachedBody(usedToday, limit)}
            actionProps={
              readOnly || raisedLimit <= limit
                ? undefined
                : {
                    primary: {
                      children: triggerLabels.getRaiseLimit(raisedLimit),
                      onClick: () => onChange(String(raisedLimit)),
                      'data-test-subj': 'automationDailyLimitRaise',
                    },
                  }
            }
            data-test-subj="automationDailyLimitReachedCallout"
          />
        </>
      )}
    </div>
  );
};
