/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ReconcileRulesResponse } from '../../common/reconcile';
import type { TickResult } from '../../common/tick';
import { ReconcileResultView } from './reconcile_result_view';
import type { GetSignalsHref } from './signals_in_discover';
import { getTickTimeRange } from './signals_in_discover';
import { TickResultView } from './tick_result_view';

/** A response, tagged with the view that knows its shape; `raw` shows it as JSON only. */
export type ActionOutcome =
  | { view: 'tick'; response: TickResult }
  | { view: 'reconcile'; response: ReconcileRulesResponse }
  | { view: 'raw'; response: unknown };

/** What one call returned, kept for the session so consecutive runs can be compared. */
export interface ActionResult {
  key: number;
  label: string;
  startedAt: string;
  durationMs: number;
  ok: boolean;
  outcome: ActionOutcome;
}

function OutcomeView({
  result,
  getSignalsHref,
}: {
  result: ActionResult;
  getSignalsHref?: GetSignalsHref;
}) {
  const { outcome } = result;
  switch (outcome.view) {
    case 'tick':
      return (
        <TickResultView
          result={outcome.response}
          signalsHref={
            outcome.response.strategies.some(({ signals }) => signals > 0)
              ? getSignalsHref?.(getTickTimeRange(result))
              : undefined
          }
        />
      );
    case 'reconcile':
      return <ReconcileResultView result={outcome.response} />;
    case 'raw':
      return null;
  }
}

interface ResultCardProps {
  result: ActionResult;
  getSignalsHref?: GetSignalsHref;
}

/** One call: what was run and how long it took, its shaped view, and the raw response. */
export function ResultCard({ result, getSignalsHref }: ResultCardProps) {
  const rawJson = (
    <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
      {JSON.stringify(result.outcome.response, null, 2)}
    </EuiCodeBlock>
  );

  return (
    <EuiPanel hasBorder data-test-subj="nightshiftDetectionInspectorResult">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{result.label}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={result.ok ? 'success' : 'danger'}>{result.ok ? 'ok' : 'error'}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {result.startedAt} · {result.durationMs} ms
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {result.outcome.view === 'raw' ? (
        rawJson
      ) : (
        <>
          <OutcomeView result={result} getSignalsHref={getSignalsHref} />
          <EuiSpacer size="s" />
          <EuiAccordion
            id={`nightshiftDetectionInspectorRaw-${result.key}`}
            buttonContent={<EuiText size="xs">Raw response</EuiText>}
            paddingSize="s"
          >
            {rawJson}
          </EuiAccordion>
        </>
      )}
    </EuiPanel>
  );
}
