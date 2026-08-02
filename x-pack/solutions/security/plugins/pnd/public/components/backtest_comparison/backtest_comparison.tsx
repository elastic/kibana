/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import * as i18n from './translations';

/**
 * One side of a tuning backtest: the alert count a rule preview produced over a window.
 *
 * Every field is optional, because every step behind it can legitimately not produce one: the watch
 * runs `system-security-rule-preview` itself, and a preview can fail, abort, or be skipped entirely
 * (a proposal that rewrites no query has nothing to backtest). So this component must treat every
 * field as untrusted — including a count read back out of a rendered summary rather than off a
 * contract field.
 */
export interface PndBacktestSide {
  alertCount?: number;
  /** Window start: an ISO 8601 timestamp or a relative expression like `now-7d`. */
  from?: string;
  /** Window end. */
  to?: string;
}

export interface PndTuningPreview {
  /** The rule with the proposed change applied. */
  after?: PndBacktestSide;
  /** The rule as it exists today. */
  before?: PndBacktestSide;
  /**
   * Why no backtest was measured, in place of the generic copy.
   *
   * There are two distinct reasons and they call for different reactions, so whoever resolves the
   * evidence says which one applies rather than leaving the approver to infer it from two absent
   * numbers: a proposal that rewrites no query has nothing to backtest by design, while a query
   * rewrite with no counts means the preview did not run or did not finish. The watch renders the
   * literal `"inconclusive"` in place of a count, which says *that* a side was unmeasured but not
   * why; `parse_tuning_proposal` turns that into one of the two reasons.
   */
  notMeasured?: string;
}

export interface BacktestComparisonProps {
  preview?: PndTuningPreview;
}

/**
 * The alert count only when it really is a number. A model-authored `"lots"` or a
 * `NaN` is not a measurement, and rendering it as one would be worse than saying
 * nothing.
 */
const measuredAlertCount = (side: PndBacktestSide | undefined): number | undefined =>
  typeof side?.alertCount === 'number' && Number.isFinite(side.alertCount)
    ? side.alertCount
    : undefined;

const windowLabel = (side: PndBacktestSide | undefined): string | undefined => {
  if (side?.from != null && side.to != null) {
    return i18n.windowRange(side.from, side.to);
  }
  if (side?.from != null) {
    return i18n.windowFrom(side.from);
  }
  if (side?.to != null) {
    return i18n.windowTo(side.to);
  }
  return undefined;
};

const deltaLabel = (before: number | undefined, after: number | undefined): string | undefined => {
  if (before === undefined || after === undefined) {
    return undefined;
  }
  if (after === before) {
    return i18n.NO_CHANGE;
  }
  return after < before ? i18n.fewerAlerts(before - after) : i18n.moreAlerts(after - before);
};

interface BacktestSideProps {
  label: string;
  side: PndBacktestSide | undefined;
  testSubjPrefix: string;
}

const BacktestSide: React.FC<BacktestSideProps> = ({ label, side, testSubjPrefix }) => {
  const alertCount = measuredAlertCount(side);
  const range = windowLabel(side);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s">
      <EuiStat
        data-test-subj={`${testSubjPrefix}Count`}
        description={label}
        textAlign="left"
        title={alertCount === undefined ? i18n.NOT_MEASURED : `${alertCount} ${i18n.ALERTS}`}
        titleSize="s"
      />
      {range != null ? (
        <EuiText color="subdued" data-test-subj={`${testSubjPrefix}Window`} size="xs">
          {range}
        </EuiText>
      ) : null}
    </EuiPanel>
  );
};

/**
 * The before/after backtest on a tuning proposal.
 *
 * An unmeasured backtest renders as an explicit "no backtest available", never as a
 * blank and never as a zero: a silent absence reads as "no change expected",
 * which is the opposite of the truth. A genuine `0` still renders as `0`, because
 * zero alerts is a real measurement.
 *
 * The callout keys on there being no measured alert count on **either** side rather
 * than on the preview object being absent, because a preview that carries only a
 * `notMeasured` reason is still not a backtest. When a reason was resolved, it
 * replaces the generic copy: the approver learns whether the preview never ran or
 * whether there was nothing to preview, rather than only that a number is missing.
 */
export const BacktestComparison: React.FC<BacktestComparisonProps> = ({ preview }) => {
  const before = preview?.before;
  const after = preview?.after;

  const beforeCount = measuredAlertCount(before);
  const afterCount = measuredAlertCount(after);
  const delta = deltaLabel(beforeCount, afterCount);

  return (
    <div data-test-subj="pndBacktestComparison">
      {beforeCount === undefined && afterCount === undefined ? (
        <EuiCallOut
          announceOnMount
          color="warning"
          data-test-subj="pndBacktestComparisonUnavailable"
          iconType="warning"
          size="s"
          text={<p>{preview?.notMeasured ?? i18n.UNAVAILABLE_BODY}</p>}
          title={i18n.UNAVAILABLE_TITLE}
        />
      ) : null}
      {before == null && after == null ? null : (
        <>
          <EuiTitle size="xxs">
            <h4>{i18n.TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <BacktestSide
                label={i18n.BEFORE}
                side={before}
                testSubjPrefix="pndBacktestComparisonBefore"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <BacktestSide
                label={i18n.AFTER}
                side={after}
                testSubjPrefix="pndBacktestComparisonAfter"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      {delta != null ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText data-test-subj="pndBacktestComparisonDelta" size="s">
            <strong>{delta}</strong>
          </EuiText>
        </>
      ) : null}
    </div>
  );
};
