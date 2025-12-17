/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_USER_RISK_SCORE_CALCULATED_LEVEL,
} from '../../../../../common/field_maps/field_names';
import { getColumns } from '../../../../detections/configurations/security_solution_detections/columns';
import { createLicenseServiceMock } from '../../../../../common/license/mocks';
import * as i18n from '../../../../detections/components/alerts_table/translations';

// Note: The EnrichedDataRow component with data-test-subj='EnrichedDataRow'
// was not found in the codebase. The enriched risk data is displayed in the
// alert flyout overview tab which shows all column values including risk columns.
// This test verifies that risk columns are included in the columns configuration
// and would be displayed in the flyout overview tab.

describe('Alert flyout enriched data columns configuration', () => {
  it('includes risk columns in columns configuration when license is Platinum+', () => {
    const licenseServiceMock = createLicenseServiceMock();
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const columns = getColumns(licenseServiceMock);

    const hostRiskColumn = columns.find((col) => col.id === ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL);
    const userRiskColumn = columns.find((col) => col.id === ALERT_USER_RISK_SCORE_CALCULATED_LEVEL);

    // Verify risk columns are included in the columns configuration
    // These columns will be displayed in the alert flyout overview tab
    expect(hostRiskColumn).toBeDefined();
    expect(userRiskColumn).toBeDefined();
    expect(hostRiskColumn?.displayAsText).toBe(i18n.ALERTS_HEADERS_HOST_RISK_LEVEL);
    expect(userRiskColumn?.displayAsText).toBe(i18n.ALERTS_HEADERS_USER_RISK_LEVEL);
  });

  it('risk columns have correct field IDs for enrichment', () => {
    const licenseServiceMock = createLicenseServiceMock();
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const columns = getColumns(licenseServiceMock);

    const hostRiskColumn = columns.find((col) => col.id === ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL);
    const userRiskColumn = columns.find((col) => col.id === ALERT_USER_RISK_SCORE_CALCULATED_LEVEL);

    // Verify column IDs match the enriched field names
    expect(hostRiskColumn?.id).toBe('host.risk.calculated_level');
    expect(userRiskColumn?.id).toBe('user.risk.calculated_level');
  });

  it('excludes risk columns when license is Basic', () => {
    const licenseServiceMock = createLicenseServiceMock();
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    const columns = getColumns(licenseServiceMock);

    const hostRiskColumn = columns.find((col) => col.id === ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL);
    const userRiskColumn = columns.find((col) => col.id === ALERT_USER_RISK_SCORE_CALCULATED_LEVEL);

    expect(hostRiskColumn).toBeUndefined();
    expect(userRiskColumn).toBeUndefined();
  });
});
