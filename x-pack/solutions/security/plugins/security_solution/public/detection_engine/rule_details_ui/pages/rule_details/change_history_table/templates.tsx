/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { RuleChangeTrackingAction, SecurityRuleChangeTrackingAction } from '@kbn/alerting-types';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { SecurityPageName } from '../../../../../../common';
import type { ChangeHistoryResult } from '../../../../rule_management/api/hooks/use_change_history';
import { SecuritySolutionLinkAnchor } from '../../../../../common/components/links';
import { getRuleDetailsUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';

const RuleLink = ({ id, text }: { id: string; text: string }) => {
  return (
    <SecuritySolutionLinkAnchor
      data-test-subj="ruleName"
      deepLinkId={SecurityPageName.rules}
      path={getRuleDetailsUrl(id)}
    >
      {text}
    </SecuritySolutionLinkAnchor>
  );
};

export const CHANGE_HISTORY_ACTION_TEMPLATE = {
  [RuleChangeTrackingAction.ruleCreate]: (item) => (
    <>
      {' made revision '}
      <EuiBadge color="hollow">{item.revision}</EuiBadge>
      {' by creating the rule.'}
    </>
  ),
  [SecurityRuleChangeTrackingAction.ruleDuplicate]: (item) => (
    <>
      {' made revision '}
      <EuiBadge color="hollow">{item.revision}</EuiBadge>
      {' duplicating '}
      {(item.metadata?.originalRuleId && (
        <RuleLink text={'a rule'} id={item.metadata.originalRuleId as string} />
      )) ||
        'a rule'}
    </>
  ),
  [SecurityRuleChangeTrackingAction.ruleInstall]: (item) => (
    <>
      {' made revision '}
      <EuiBadge color="hollow">{item.revision}</EuiBadge>
      {' when installing the rule.'}
    </>
  ),
  [RuleChangeTrackingAction.ruleUpdate]: (item, euiTheme) => {
    const INLINE_LIMIT = 3;
    const MAX_TOOLTIP_ITEMS = 30;
    const changes = item.changes
      .map((f) => f.replace(/^(\w|\.)+\./, ''))
      .reduce((res, c, i, arr) => {
        if (i < INLINE_LIMIT)
          res.push(
            <EuiBadge key={i} color="hollow">
              {c}
            </EuiBadge>
          );
        else if (i === INLINE_LIMIT && arr.length > INLINE_LIMIT)
          res.push(
            <React.Fragment key={i}>
              {` and `}
              <EuiToolTip
                css={css`
                  color: ${euiTheme.colors.ink};
                  background-color: ${euiTheme.colors.backgroundBaseSubdued};
                `}
                position="top"
                content={arr.slice(INLINE_LIMIT, INLINE_LIMIT + MAX_TOOLTIP_ITEMS).map((k) => (
                  <>
                    {k}
                    <br />
                  </>
                ))}
              >
                <EuiBadge
                  css={css`
                    cursor: 'pointer';
                  `}
                  tabIndex={0}
                  color="hollow"
                >{`${arr.length - INLINE_LIMIT} other`}</EuiBadge>
              </EuiToolTip>
            </React.Fragment>
          );
        return res;
      }, [] as JSX.Element[]);
    return (
      <>
        {' made revision '}
        <EuiBadge color="hollow">{item.revision}</EuiBadge>
        {' updating '}
        {changes.length ? changes : `(no changes)`}
      </>
    );
  },
  [RuleChangeTrackingAction.ruleEnable]: () => <>{' enabled the rule.'}</>,
  [RuleChangeTrackingAction.ruleDisable]: () => <>{' disabled the rule.'}</>,
} as Record<string, (item: ChangeHistoryResult, euiTheme: EuiThemeComputed) => JSX.Element>;
