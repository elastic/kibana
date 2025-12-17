/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getColumns } from '../../configurations/security_solution_detections/columns';
import { createLicenseServiceMock } from '../../../../common/license/mocks';
import {
  ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_USER_RISK_SCORE_CALCULATED_LEVEL,
} from '../../../../common/field_maps/field_names';
import * as i18n from './translations';

// Mock the ResponseOpsAlertsTable component since it's from a shared package
jest.mock('@kbn/response-ops-alerts-table', () => ({
  AlertsTable: jest.fn(({ columns: tableColumns }) => (
    <div data-test-subj="alerts-table">
      {tableColumns?.map((col: { id: string; displayAsText?: string }) => (
        <div key={col.id} data-test-subj={`column-${col.id}`}>
          {col.displayAsText || col.id}
        </div>
      ))}
    </div>
  )),
}));

// Mock hooks and dependencies
jest.mock('../../../common/hooks/use_license', () => ({
  useLicense: jest.fn().mockReturnValue({
    isPlatinumPlus: jest.fn().mockReturnValue(true),
    isEnterprise: jest.fn().mockReturnValue(true),
    isGoldPlus: jest.fn().mockReturnValue(true),
  }),
}));

jest.mock('../../../sourcerer/containers');
jest.mock('../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../data_view_manager/hooks/use_browser_fields');
jest.mock('../../../common/containers/use_global_time');
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useSelector: jest.fn(() => ({
      initialized: true,
      viewMode: 'grid',
      columns: [],
      totalCount: 0,
    })),
  };
});

describe('AlertsTable with risk enrichments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Column configuration', () => {
    it('includes host and user risk columns when license is Platinum+', () => {
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
      expect(hostRiskColumn?.displayAsText).toBe(i18n.ALERTS_HEADERS_HOST_RISK_LEVEL);
      expect(userRiskColumn?.displayAsText).toBe(i18n.ALERTS_HEADERS_USER_RISK_LEVEL);
    });

    it('excludes host and user risk columns when license is Basic', () => {
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

    it('risk columns have correct IDs matching field names', () => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
      const columns = getColumns(licenseServiceMock);

      const hostRiskColumn = columns.find(
        (col) => col.id === ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL
      );
      const userRiskColumn = columns.find(
        (col) => col.id === ALERT_USER_RISK_SCORE_CALCULATED_LEVEL
      );

      expect(hostRiskColumn?.id).toBe('host.risk.calculated_level');
      expect(userRiskColumn?.id).toBe('user.risk.calculated_level');
    });
  });
});
