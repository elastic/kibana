/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteWarm, useEuiTheme } from '@elastic/eui';
import {
  RISK_SCORE_MEDIUM,
  RISK_SCORE_HIGH,
  RISK_SCORE_CRITICAL,
} from '../../../../../../../common/constants';
import { getFillColor, getRiskScorePalette, RISK_SCORE_STEPS } from '.';
import { renderHook } from '@testing-library/react';
import { getRiskSeverityColors } from '../../../../../../../common/utils/risk_color_palette';

describe('getFillColor', () => {
  const { result } = renderHook(() => useEuiTheme());
  const euiTheme = result.current.euiTheme;

  describe('when using the Risk Score palette', () => {
    const colorPalette = getRiskScorePalette(RISK_SCORE_STEPS, euiTheme);
    const expectedColorPalette = getRiskSeverityColors(euiTheme);

    it('returns the expected fill color', () => {
      expect(getFillColor({ riskScore: 50, colorPalette })).toEqual('#D6BF57');
    });

    it('returns the expected fill color when risk score is zero', () => {
      expect(getFillColor({ riskScore: 0, colorPalette })).toEqual('#54B399');
    });

    it('returns the expected fill color when risk score is less than zero', () => {
      expect(getFillColor({ riskScore: -1, colorPalette })).toEqual('#54B399');
    });

    it('returns the expected fill color when risk score is 100', () => {
      expect(getFillColor({ riskScore: 100, colorPalette })).toEqual('#E7664C');
    });

    it('returns the expected fill color when risk score is greater than 100', () => {
      expect(getFillColor({ riskScore: 101, colorPalette })).toEqual('#E7664C');
    });

    it('returns the expected fill color when risk score is greater than RISK_SCORE_CRITICAL', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_CRITICAL + 1, colorPalette })).toEqual(
        expectedColorPalette.critical
      );
    });

    it('returns the expected fill color when risk score is equal to RISK_SCORE_CRITICAL', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_CRITICAL, colorPalette })).toEqual(
        expectedColorPalette.critical
      );
    });

    it('returns the expected fill color when risk score is greater than RISK_SCORE_HIGH', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_HIGH + 1, colorPalette })).toEqual(
        expectedColorPalette.high
      );
    });

    it('returns the expected fill color when risk score is equal to RISK_SCORE_HIGH', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_HIGH, colorPalette })).toEqual(
        expectedColorPalette.high
      );
    });

    it('returns the expected fill color when risk score is greater than RISK_SCORE_MEDIUM', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_MEDIUM + 1, colorPalette })).toEqual(
        expectedColorPalette.medium
      );
    });

    it('returns the expected fill color when risk score is equal to RISK_SCORE_MEDIUM', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_MEDIUM, colorPalette })).toEqual(
        expectedColorPalette.medium
      );
    });

    it('returns the expected fill color when risk score is less than RISK_SCORE_MEDIUM', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_MEDIUM - 1, colorPalette })).toEqual(
        expectedColorPalette.low
      );
    });
  });

  describe('when using an EUI palette', () => {
    const colorPalette = euiPaletteWarm(RISK_SCORE_STEPS);

    it('returns the expected fill color', () => {
      expect(getFillColor({ riskScore: 50, colorPalette })).toEqual('#ffaea5');
    });

    it('returns the expected fill color when risk score is zero', () => {
      expect(getFillColor({ riskScore: 0, colorPalette })).toEqual('#ffe7e4');
    });

    it('returns the expected fill color when risk score is less than zero', () => {
      expect(getFillColor({ riskScore: -1, colorPalette })).toEqual('#ffe7e4');
    });

    it('returns the expected fill color when risk score is 100', () => {
      expect(getFillColor({ riskScore: 100, colorPalette })).toEqual('#f6726a');
    });

    it('returns the expected fill color when risk score is greater than 100', () => {
      expect(getFillColor({ riskScore: 101, colorPalette })).toEqual('#f6726a');
    });
  });
});
