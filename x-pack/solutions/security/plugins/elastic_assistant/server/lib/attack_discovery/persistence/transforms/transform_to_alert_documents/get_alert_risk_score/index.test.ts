/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';

import { getAlertRiskScore } from '.';

describe('getAlertRiskScore', () => {
  // Test data with minimal examples covering different scenarios
  const createAlertDocument = (alertId: string, riskScore?: number): Document => ({
    pageContent: `@timestamp,2024-10-16T02:40:08.837Z
_id,${alertId}
${riskScore !== undefined ? `kibana.alert.risk_score,${riskScore}` : ''}
host.name,test-host
event.category,malware
message,Test alert`,
    metadata: {},
  });

  const alertIdWithRiskScore = '87c42d26897490ee02ba42ec4e872910b29f3c69bda357b8faf197b533b8528a';
  const alertIdWithoutRiskScore =
    'be6d293f9a71ba209adbcacc3ba04adfd8e9456260f6af342b7cb0478a7a144a';
  const nonExistentAlertId = 'f9c0dc4953531a9fc757e8ae88bf70a70e20dfc665de92241f162cff9191fa4e';

  let anonymizedAlerts: Document[];

  beforeEach(() => {
    anonymizedAlerts = [
      createAlertDocument(alertIdWithRiskScore, 99),
      createAlertDocument(alertIdWithoutRiskScore), // No risk score
    ];
  });

  describe('when provided valid alert IDs with risk scores', () => {
    it('returns the sum of risk scores for matching alerts', () => {
      const result = getAlertRiskScore({
        alertIds: [alertIdWithRiskScore],
        anonymizedAlerts,
      });

      expect(result).toBe(99);
    });

    it('returns the sum when multiple alerts with risk scores match', () => {
      const secondAlertId = 'second-alert-id';
      anonymizedAlerts.push(createAlertDocument(secondAlertId, 75));

      const result = getAlertRiskScore({
        alertIds: [alertIdWithRiskScore, secondAlertId],
        anonymizedAlerts,
      });

      expect(result).toBe(174);
    });
  });

  describe('when provided alert IDs without risk scores', () => {
    it('returns undefined when alert exists but has no risk score', () => {
      const result = getAlertRiskScore({
        alertIds: [alertIdWithoutRiskScore],
        anonymizedAlerts,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('when provided non-existent alert IDs', () => {
    it('returns undefined when alert ID does not exist in documents', () => {
      const result = getAlertRiskScore({
        alertIds: [nonExistentAlertId],
        anonymizedAlerts,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('when provided empty inputs', () => {
    it('returns undefined when alert IDs array is empty', () => {
      const result = getAlertRiskScore({
        alertIds: [],
        anonymizedAlerts,
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when anonymized alerts array is empty', () => {
      const result = getAlertRiskScore({
        alertIds: [alertIdWithRiskScore],
        anonymizedAlerts: [],
      });

      expect(result).toBeUndefined();
    });
  });

  describe('when provided mixed scenarios', () => {
    it('returns sum of only the alerts with risk scores', () => {
      const alertWithRisk = 'alert-with-risk';
      anonymizedAlerts.push(createAlertDocument(alertWithRisk, 50));

      const result = getAlertRiskScore({
        alertIds: [alertIdWithRiskScore, alertIdWithoutRiskScore, alertWithRisk],
        anonymizedAlerts,
      });

      expect(result).toBe(149); // 99 + 50
    });

    it('returns undefined when some alert IDs exist but none have risk scores', () => {
      const result = getAlertRiskScore({
        alertIds: [alertIdWithoutRiskScore, nonExistentAlertId],
        anonymizedAlerts,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('when document pageContent format is malformed', () => {
    it('returns undefined when pageContent does not contain the _id field', () => {
      const malformedDoc: Document = {
        pageContent: 'kibana.alert.risk_score,99\nhost.name,test-host',
        metadata: {},
      };

      const result = getAlertRiskScore({
        alertIds: [alertIdWithRiskScore],
        anonymizedAlerts: [malformedDoc],
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when the risk score field has an invalid format', () => {
      const invalidRiskScoreDoc: Document = {
        pageContent: `_id,${alertIdWithRiskScore}\nkibana.alert.risk_score,invalid\nhost.name,test-host`,
        metadata: {},
      };

      const result = getAlertRiskScore({
        alertIds: [alertIdWithRiskScore],
        anonymizedAlerts: [invalidRiskScoreDoc],
      });

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('returns undefined when risk score is zero', () => {
      anonymizedAlerts = [createAlertDocument(alertIdWithRiskScore, 0)];

      const result = getAlertRiskScore({
        alertIds: [alertIdWithRiskScore],
        anonymizedAlerts,
      });

      expect(result).toBeUndefined();
    });

    it('returns risk score when only one alert has a positive risk score', () => {
      const zeroRiskAlertId = 'zero-risk-alert';
      anonymizedAlerts.push(createAlertDocument(zeroRiskAlertId, 0));

      const result = getAlertRiskScore({
        alertIds: [alertIdWithRiskScore, zeroRiskAlertId],
        anonymizedAlerts,
      });

      expect(result).toBe(99);
    });

    it('returns undefined when risk score is NaN', () => {
      const nanRiskScoreDoc: Document = {
        pageContent: `_id,${alertIdWithRiskScore}\nkibana.alert.risk_score,NaN\nhost.name,test-host`,
        metadata: {},
      };

      const result = getAlertRiskScore({
        alertIds: [alertIdWithRiskScore],
        anonymizedAlerts: [nanRiskScoreDoc],
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when the extracted ID is null', () => {
      const nullIdDoc: Document = {
        pageContent: '_id,\nkibana.alert.risk_score,99\nhost.name,test-host',
        metadata: {},
      };

      const result = getAlertRiskScore({
        alertIds: [''],
        anonymizedAlerts: [nullIdDoc],
      });

      expect(result).toBeUndefined();
    });
  });
});
