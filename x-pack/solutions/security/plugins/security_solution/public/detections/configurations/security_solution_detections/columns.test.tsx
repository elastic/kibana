/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostRiskLevelColumn, userRiskLevelColumn, getColumns, getBaseColumns } from './columns';
import {
  ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_USER_RISK_SCORE_CALCULATED_LEVEL,
} from '../../../../common/field_maps/field_names';
import { createLicenseServiceMock } from '../../../../common/license/mocks';
import * as i18n from '../../components/alerts_table/translations';

describe('Risk score columns configuration', () => {
  describe('hostRiskLevelColumn', () => {
    it('has correct id', () => {
      expect(hostRiskLevelColumn.id).toBe(ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL);
    });

    it('has correct display text', () => {
      expect(hostRiskLevelColumn.displayAsText).toBe(i18n.ALERTS_HEADERS_HOST_RISK_LEVEL);
    });
  });

  describe('userRiskLevelColumn', () => {
    it('has correct id', () => {
      expect(userRiskLevelColumn.id).toBe(ALERT_USER_RISK_SCORE_CALCULATED_LEVEL);
    });

    it('has correct display text', () => {
      expect(userRiskLevelColumn.displayAsText).toBe(i18n.ALERTS_HEADERS_USER_RISK_LEVEL);
    });
  });

  describe('getBaseColumns', () => {
    it('includes risk columns when license is Platinum+', () => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
      const columns = getBaseColumns(licenseServiceMock);

      const hostRiskColumn = columns.find(
        (col) => col.id === ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL
      );
      const userRiskColumn = columns.find(
        (col) => col.id === ALERT_USER_RISK_SCORE_CALCULATED_LEVEL
      );

      expect(hostRiskColumn).toBeDefined();
      expect(userRiskColumn).toBeDefined();
      expect(hostRiskColumn?.displayAsText).toBe(i18n.ALERTS_HEADERS_HOST_RISK_LEVEL);
      expect(userRiskColumn?.displayAsText).toBe(i18n.ALERTS_HEADERS_USER_RISK_LEVEL);
    });

    it('excludes risk columns when license is Basic', () => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
      const columns = getBaseColumns(licenseServiceMock);

      const hostRiskColumn = columns.find(
        (col) => col.id === ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL
      );
      const userRiskColumn = columns.find(
        (col) => col.id === ALERT_USER_RISK_SCORE_CALCULATED_LEVEL
      );

      expect(hostRiskColumn).toBeUndefined();
      expect(userRiskColumn).toBeUndefined();
    });
  });

  describe('getColumns', () => {
    it('includes risk columns in full column set when license is Platinum+', () => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
      const columns = getColumns(licenseServiceMock);

      const hostRiskColumn = columns.find(
        (col) => col.id === ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL
      );
      const userRiskColumn = columns.find(
        (col) => col.id === ALERT_USER_RISK_SCORE_CALCULATED_LEVEL
      );

      expect(hostRiskColumn).toBeDefined();
      expect(userRiskColumn).toBeDefined();
    });

    it('excludes risk columns from full column set when license is Basic', () => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
      const columns = getColumns(licenseServiceMock);

      const hostRiskColumn = columns.find(
        (col) => col.id === ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL
      );
      const userRiskColumn = columns.find(
        (col) => col.id === ALERT_USER_RISK_SCORE_CALCULATED_LEVEL
      );

      expect(hostRiskColumn).toBeUndefined();
      expect(userRiskColumn).toBeUndefined();
    });
  });
});
