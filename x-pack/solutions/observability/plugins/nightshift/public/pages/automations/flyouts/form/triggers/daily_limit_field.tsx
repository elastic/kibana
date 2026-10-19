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
import { KbnWarningCallout } from '@kbn/ui-callout';
import { Sentence } from './pills/sentence';
import { triggerLabels } from './translations';
import { isValidDailyLimit } from '../validation';
import {
  MAX_DAILY_LIMIT,
  SOFT_DAILY_LIMIT,
  getDailyUsageTone,
  suggestRaisedLimit,
} from '../../../utils/daily_usage';

export const DailyLimitField = ({
  value,
  helpText,
  onChange,
  usedToday,
  savedLimit,
  onRaiseLimit,
  readOnly = false,
}: {
  value: string;
  helpText: string;
  onChange: (value: string) => void;
  usedToday?: number;
  savedLimit?: number;
  onRaiseLimit?: (limit: number) => void;
  readOnly?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const limit = Number(value);
  const tone =
    usedToday === undefined || limit < 1 ? 'healthy' : getDailyUsageTone(usedToday, limit);
  const raisedLimit = suggestRaisedLimit(usedToday ?? 0, limit);
  const raise = readOnly ? onRaiseLimit : (next: number) => onChange(String(next));
  const raiseAction =
    raise && raisedLimit > limit
      ? {
          primary: {
            children: triggerLabels.getRaiseLimit(raisedLimit),
            onClick: () => raise(raisedLimit),
            'data-test-subj': 'automationDailyLimitRaise',
          },
        }
      : undefined;
  const calloutCss = { marginBlockStart: euiTheme.size.s };
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
      {usedToday !== undefined && tone === 'exceeded' && (
        <EuiCallOut
          announceOnMount={false}
          size="s"
          color="warning"
          iconType="hourglass"
          css={calloutCss}
          title={triggerLabels.dailyLimitReached}
          text={triggerLabels.getDailyLimitReachedBody(usedToday, limit)}
          actionProps={raiseAction}
          data-test-subj="automationDailyLimitReachedCallout"
        />
      )}
      {usedToday !== undefined && tone === 'high' && (
        <EuiCallOut
          announceOnMount={false}
          size="s"
          color="warning"
          iconType="hourglass"
          css={calloutCss}
          title={triggerLabels.dailyLimitApproaching}
          text={triggerLabels.getDailyLimitApproachingBody(usedToday, limit)}
          actionProps={raiseAction}
          data-test-subj="automationDailyLimitApproachingCallout"
        />
      )}
      {limit > SOFT_DAILY_LIMIT && (
        <KbnWarningCallout
          announceOnMount={false}
          size="s"
          css={calloutCss}
          title={triggerLabels.highDailyLimit}
          text={
            <>
              <p>{triggerLabels.getHighDailyLimitBody(limit, SOFT_DAILY_LIMIT)}</p>
              <p>{triggerLabels.getPlanLimitBody(MAX_DAILY_LIMIT)}</p>
            </>
          }
          data-test-subj="automationDailyLimitSoftCapCallout"
        />
      )}
      {!readOnly && savedLimit !== undefined && savedLimit !== limit && (
        <EuiCallOut
          announceOnMount={false}
          size="s"
          color="primary"
          iconType="save"
          css={calloutCss}
          title={triggerLabels.getUnsavedLimitTitle(limit)}
          text={<p>{triggerLabels.getUnsavedLimitBody(savedLimit)}</p>}
          data-test-subj="automationDailyLimitUnsavedCallout"
        />
      )}
    </div>
  );
};
