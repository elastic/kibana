/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { UXMetrics } from '@kbn/observability-shared-plugin/public';
import { render } from '../../../../../../utils/test_helper';
import CoreVitals from './core_vitals';

/**
 * Exposes the live EUI status colours so assertions don't hardcode hex values
 * that would churn whenever the theme changes.
 */
function ThemeColorsProbe() {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  return (
    <div
      data-test-subj="themeColorsProbe"
      data-success={colors.textSuccess}
      data-warning={colors.textWarning}
      data-danger={colors.textDanger}
    />
  );
}

// `EuiStat` applies `titleColor` as an inline style, which jsdom reports in `rgb()`
// form. Push the theme token through the same normalisation so the two compare.
const toRgb = (color: string) => {
  const probe = document.createElement('div');
  probe.style.color = color;
  return probe.style.color;
};

describe('CoreVitals', () => {
  // Every case below pairs its metric with a good-majority `ranks` distribution, so
  // the only way to get a non-green stat is to classify the displayed value itself.
  const goodMajorityRanks = [85, 10, 5];

  const renderCoreVitals = (data: UXMetrics) => {
    const { getByTestId } = render(
      <>
        <ThemeColorsProbe />
        <CoreVitals data={data} loading={false} />
      </>
    );

    const probe = getByTestId('themeColorsProbe');

    return {
      statColor: (dataTestSubj: string) =>
        getByTestId(dataTestSubj).querySelector('.euiStat__title')?.getAttribute('style'),
      expectedColor: (status: 'success' | 'warning' | 'danger') =>
        `color: ${toRgb(probe.getAttribute(`data-${status}`) as string)};`,
    };
  };

  it('colours a poor value with the danger colour even when most users are in the good bucket', () => {
    // Regression for the "always green" bug: LCP of 13.66s is poor, but 85% of
    // users fall in the good bucket, which is what used to drive the colour.
    const { statColor, expectedColor } = renderCoreVitals({
      lcp: 13660,
      lcpRanks: goodMajorityRanks,
    });

    expect(statColor('lcp-core-vital')).toBe(expectedColor('danger'));
  });

  it('colours a needs-improvement value with the warning colour', () => {
    const { statColor, expectedColor } = renderCoreVitals({
      inp: 285,
      inpRanks: goodMajorityRanks,
    });

    expect(statColor('inp-core-vital')).toBe(expectedColor('warning'));
  });

  it('colours a good value with the success colour', () => {
    const { statColor, expectedColor } = renderCoreVitals({
      cls: 0.01,
      clsRanks: goodMajorityRanks,
    });

    expect(statColor('cls-core-vital')).toBe(expectedColor('success'));
  });

  it('colours each metric independently from the same response', () => {
    const { statColor, expectedColor } = renderCoreVitals({
      lcp: 13660,
      lcpRanks: goodMajorityRanks,
      inp: 285,
      inpRanks: goodMajorityRanks,
      cls: 0.01,
      clsRanks: goodMajorityRanks,
    });

    expect(statColor('lcp-core-vital')).toBe(expectedColor('danger'));
    expect(statColor('inp-core-vital')).toBe(expectedColor('warning'));
    expect(statColor('cls-core-vital')).toBe(expectedColor('success'));
  });
});
