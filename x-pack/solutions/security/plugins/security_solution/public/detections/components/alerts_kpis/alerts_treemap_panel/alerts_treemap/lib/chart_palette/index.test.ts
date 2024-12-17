/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteWarm } from '@elastic/eui';
import {
  RISK_COLOR_LOW,
  RISK_COLOR_MEDIUM,
  RISK_COLOR_HIGH,
  RISK_COLOR_CRITICAL,
  RISK_SCORE_MEDIUM,
  RISK_SCORE_HIGH,
  RISK_SCORE_CRITICAL,
} from '../../../../../../../common/constants';
import { getFillColor, getRiskScorePalette, RISK_SCORE_STEPS } from '.';

describe('getFillColor', () => {
  describe('when using the Risk Score palette', () => {
    const colorPalette = getRiskScorePalette(RISK_SCORE_STEPS);

    it('returns the expected fill color', () => {
      expect(getFillColor({ riskScore: 50, colorPalette })).toEqual('#d6bf57');
    });

    it('returns the expected fill color when risk score is zero', () => {
      expect(getFillColor({ riskScore: 0, colorPalette })).toEqual('#54b399');
    });

    it('returns the expected fill color when risk score is less than zero', () => {
      expect(getFillColor({ riskScore: -1, colorPalette })).toEqual('#54b399');
    });

    it('returns the expected fill color when risk score is 100', () => {
      expect(getFillColor({ riskScore: 100, colorPalette })).toEqual('#e7664c');
    });

    it('returns the expected fill color when risk score is greater than 100', () => {
      expect(getFillColor({ riskScore: 101, colorPalette })).toEqual('#e7664c');
    });

    it('returns the expected fill color when risk score is greater than RISK_SCORE_CRITICAL', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_CRITICAL + 1, colorPalette })).toEqual(
        RISK_COLOR_CRITICAL
      );
    });

    it('returns the expected fill color when risk score is equal to RISK_SCORE_CRITICAL', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_CRITICAL, colorPalette })).toEqual(
        RISK_COLOR_CRITICAL
      );
    });

    it('returns the expected fill color when risk score is greater than RISK_SCORE_HIGH', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_HIGH + 1, colorPalette })).toEqual(
        RISK_COLOR_HIGH
      );
    });

    it('returns the expected fill color when risk score is equal to RISK_SCORE_HIGH', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_HIGH, colorPalette })).toEqual(RISK_COLOR_HIGH);
    });

    it('returns the expected fill color when risk score is greater than RISK_SCORE_MEDIUM', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_MEDIUM + 1, colorPalette })).toEqual(
        RISK_COLOR_MEDIUM
      );
    });

    it('returns the expected fill color when risk score is equal to RISK_SCORE_MEDIUM', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_MEDIUM, colorPalette })).toEqual(
        RISK_COLOR_MEDIUM
      );
    });

    it('returns the expected fill color when risk score is less than RISK_SCORE_MEDIUM', () => {
      expect(getFillColor({ riskScore: RISK_SCORE_MEDIUM - 1, colorPalette })).toEqual(
        RISK_COLOR_LOW
      );
    });
  });

  describe('when using an EUI palette', () => {
    const colorPalette = euiPaletteWarm(RISK_SCORE_STEPS);

    it('returns the expected fill color', () => {
      expect(getFillColor({ riskScore: 50, colorPalette })).toEqual('#efb685');
    });

    it('returns the expected fill color when risk score is zero', () => {
      expect(getFillColor({ riskScore: 0, colorPalette })).toEqual('#fbfada');
    });

    it('returns the expected fill color when risk score is less than zero', () => {
      expect(getFillColor({ riskScore: -1, colorPalette })).toEqual('#fbfada');
    });

    it('returns the expected fill color when risk score is 100', () => {
      expect(getFillColor({ riskScore: 100, colorPalette })).toEqual('#e7664c');
    });

    it('returns the expected fill color when risk score is greater than 100', () => {
      expect(getFillColor({ riskScore: 101, colorPalette })).toEqual('#e7664c');
    });
  });
});
