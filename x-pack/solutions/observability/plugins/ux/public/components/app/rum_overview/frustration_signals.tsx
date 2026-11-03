/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { RumFrustrationCounts, RumFrustrationKind } from '../../../../common/rum_app';
import type { RumBudgetItem } from '../../../../common/rum_budgets';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { BudgetChips } from '../rum_budgets/budget_chips';

const rateLabel = (count: number, sessions: number): string => {
  if (sessions <= 0) {
    return i18n.translate('xpack.ux.overview.frustration.noSessionsLabel', {
      defaultMessage: 'No sessions',
    });
  }
  const pct = Math.round((count / sessions) * 1000) / 10;
  return i18n.translate('xpack.ux.overview.frustration.sessionShareLabel', {
    defaultMessage: '{pct}% of sessions',
    values: { pct },
  });
};

const SIGNALS: Array<{
  kind: RumFrustrationKind;
  icon: string;
  color: 'warning' | 'danger' | 'subdued';
  progress: 'warning' | 'danger' | 'subdued';
  testSubj: string;
  label: string;
  count: (frustration: RumFrustrationCounts) => number;
}> = [
  {
    kind: 'rage',
    icon: 'bolt',
    color: 'warning',
    progress: 'warning',
    testSubj: 'uxOverviewFrustrationRage',
    label: i18n.translate('xpack.ux.overview.frustration.rage', {
      defaultMessage: 'Rage-click sessions',
    }),
    count: (frustration) => frustration.rageSessions,
  },
  {
    kind: 'error',
    icon: 'error',
    color: 'danger',
    progress: 'danger',
    testSubj: 'uxOverviewFrustrationErrors',
    label: i18n.translate('xpack.ux.overview.frustration.errors', {
      defaultMessage: 'Sessions with errors',
    }),
    count: (frustration) => frustration.errorSessions,
  },
  {
    kind: 'dead',
    icon: 'minusCircle',
    color: 'subdued',
    progress: 'subdued',
    testSubj: 'uxOverviewFrustrationDead',
    label: i18n.translate('xpack.ux.overview.frustration.dead', {
      defaultMessage: 'Dead-click sessions',
    }),
    count: (frustration) => frustration.deadClickSessions,
  },
];

export function FrustrationSignalsPanel({
  frustration,
  sessions,
  budgets,
  pageUrl,
  hideHeader = false,
  headerExtra,
  flush = false,
}: {
  frustration: RumFrustrationCounts;
  sessions: number;
  budgets: RumBudgetItem[];
  pageUrl?: string;
  hideHeader?: boolean;
  headerExtra?: React.ReactNode;
  flush?: boolean;
}) {
  const history = useHistory();

  return (
    <EuiPanel
      hasBorder={!flush}
      paddingSize={flush ? 'none' : 'm'}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      data-test-subj="uxOverviewFrustrationPanel"
    >
      {!hideHeader && (
        <>
          <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="s">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.ux.overview.frustrationTitle', {
                    defaultMessage: 'Frustration signals',
                  })}
                </h3>
              </EuiTitle>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.ux.overview.frustration.subtitleDescription', {
                  defaultMessage: 'Share of sessions in this range',
                })}
              </EuiText>
            </EuiFlexItem>
            {headerExtra ? <EuiFlexItem grow={false}>{headerExtra}</EuiFlexItem> : null}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFlexGroup direction="column" gutterSize="m" style={{ flex: 1 }}>
        {SIGNALS.map((signal) => {
          const count = signal.count(frustration);
          const active = count > 0;
          return (
            <EuiFlexItem key={signal.kind} style={{ justifyContent: 'center' }}>
              <EuiLink
                data-test-subj={signal.testSubj}
                style={{ display: 'block' }}
                onClick={() =>
                  pushRumPath(
                    history,
                    '/session-replay',
                    sessionsPatch({ frustration: signal.kind })
                  )
                }
              >
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={signal.icon}
                      color={active ? signal.color : 'subdued'}
                      aria-hidden={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color={active ? 'default' : 'subdued'}>
                      {signal.label}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{count}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {rateLabel(count, sessions)}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiProgress
                  value={count}
                  max={Math.max(1, sessions)}
                  size="s"
                  color={active ? signal.progress : 'subdued'}
                />
              </EuiLink>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <BudgetChips items={budgets} templateId="frustration" pagePath={pageUrl} />
    </EuiPanel>
  );
}
