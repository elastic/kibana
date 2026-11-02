/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { getEntityAnalyticsNewHomeScopeId } from '../../../../entity_analytics/common/scope_time_ranges';
import { useAnomaliesTableData } from '../../../../common/components/ml/anomaly/use_anomalies_table_data';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import {
  ObservedDataSectionContent,
  type ObservedDataSectionProps,
} from './observed_data_section_content';

jest.mock('@kbn/entity-store/public', () => ({ useEntityStoreEuidApi: () => undefined }));
jest.mock('../../../../common/containers/use_global_time');
jest.mock('../../../../common/components/ml/anomaly/use_anomalies_table_data');
jest.mock('../../../../common/components/ml/hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobNameById: () => ({ jobNameById: { 'job-1': 'Job 1' } }),
}));
jest.mock('../../../../common/components/ml/criteria/host_to_criteria', () => ({
  hostToCriteria: () => [],
}));
jest.mock('../../../../common/components/ml/criteria/get_criteria_from_users_type', () => ({
  getCriteriaFromUsersType: () => [],
}));
jest.mock('../../../../common/components/ml/anomaly/anomaly_table_euid', () => ({
  buildAnomaliesTableInfluencersFilterQuery: () => undefined,
}));
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => false,
}));
jest.mock('../../host/main/hooks/use_observed_host_fields', () => ({
  useObservedHostFields: () => [],
}));
jest.mock('../../user/main/hooks/use_observed_user_fields', () => ({
  useObservedUserFields: () => [],
}));
jest.mock('./observed_entity', () => ({ ObservedEntity: () => null }));

const mockUseAnomaliesTableData = jest.mocked(useAnomaliesTableData);
const mockUseGlobalTime = jest.mocked(useGlobalTime);

const NOW = new Date('2024-06-15T12:00:00.000Z');
const GLOBAL_FROM = '2024-06-01T00:00:00.000Z';
const GLOBAL_TO = '2024-06-02T00:00:00.000Z';

const defaultProps: ObservedDataSectionProps = {
  entityType: EntityType.host,
  observedData: { details: {} } as ObservedDataSectionProps['observedData'],
  identityFields: {},
  contextID: 'context-id',
  scopeId: 'unpinned-scope',
  queryId: 'query-id',
  hideAnomalies: false,
};

const renderContent = (props: Partial<ObservedDataSectionProps> = {}) =>
  render(<ObservedDataSectionContent {...defaultProps} {...props} />);

describe('ObservedDataSectionContent anomalies time range', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    mockUseGlobalTime.mockReturnValue({
      from: GLOBAL_FROM,
      to: GLOBAL_TO,
      isInitializing: false,
    } as ReturnType<typeof useGlobalTime>);
    mockUseAnomaliesTableData.mockReturnValue([false, null]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('passes resolved ISO bounds, not datemath strings, for a scope that pins a range', () => {
    renderContent({ scopeId: getEntityAnalyticsNewHomeScopeId('24h') });

    const { startDate, endDate } = mockUseAnomaliesTableData.mock.lastCall?.[0] ?? {};
    expect(startDate).toBe('2024-06-14T12:00:00.000Z');
    expect(endDate).toBe(NOW.toISOString());
    // The hook parses both with `new Date(...)`; datemath strings would yield NaN here.
    expect(new Date(startDate ?? '').getTime()).toBe(
      new Date('2024-06-14T12:00:00.000Z').getTime()
    );
    expect(new Date(endDate ?? '').getTime()).toBe(NOW.getTime());
  });

  it('resolves the selected window for each pinned scope', () => {
    renderContent({ scopeId: getEntityAnalyticsNewHomeScopeId('7d') });

    expect(mockUseAnomaliesTableData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: '2024-06-08T12:00:00.000Z',
        endDate: NOW.toISOString(),
      })
    );
  });

  it('falls back to the global time range for a scope that pins none', () => {
    renderContent({ scopeId: 'unpinned-scope' });

    expect(mockUseAnomaliesTableData).toHaveBeenLastCalledWith(
      expect.objectContaining({ startDate: GLOBAL_FROM, endDate: GLOBAL_TO })
    );
  });
});
