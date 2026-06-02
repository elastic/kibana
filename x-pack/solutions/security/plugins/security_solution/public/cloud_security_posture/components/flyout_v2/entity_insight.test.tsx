/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntityInsight } from './entity_insight';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations', () => ({
  useHasMisconfigurations: jest.fn().mockReturnValue({
    hasMisconfigurationFindings: false,
    passedFindings: 0,
    failedFindings: 0,
  }),
}));

jest.mock('@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities', () => ({
  useHasVulnerabilities: jest.fn().mockReturnValue({ hasVulnerabilitiesFindings: false }),
}));

jest.mock('@kbn/entity-store/public', () => ({
  ...jest.requireActual('@kbn/entity-store/public'),
  useEntityStoreEuidApi: jest.fn().mockReturnValue({ euid: null }),
}));

jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({ to: '2023-01-01', from: '2022-01-01' }),
}));

jest.mock('../../hooks/use_non_closed_alerts', () => ({
  useNonClosedAlerts: jest.fn().mockReturnValue({
    hasNonClosedAlerts: false,
    filteredAlertsData: null,
  }),
}));

jest.mock('../../../common/lib/kibana', () => ({
  useUiSetting: jest.fn().mockReturnValue(false),
  useKibana: jest.fn().mockReturnValue({ services: {} }),
}));

import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { useNonClosedAlerts } from '../../hooks/use_non_closed_alerts';

describe('EntityInsight (v2)', () => {
  const mockOpenDetailsPanel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useHasMisconfigurations as jest.Mock).mockReturnValue({
      hasMisconfigurationFindings: false,
      passedFindings: 0,
      failedFindings: 0,
    });
    (useNonClosedAlerts as jest.Mock).mockReturnValue({
      hasNonClosedAlerts: false,
      filteredAlertsData: null,
    });
  });

  it('does not render the accordion when there are no insights', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <EntityInsight
          identityFields={{ 'host.name': 'my-host' }}
          openDetailsPanel={mockOpenDetailsPanel}
          entityType="host"
        />
      </TestProviders>
    );

    expect(queryByTestId('entityInsightTestSubj')).not.toBeInTheDocument();
  });

  it('renders the accordion when there are misconfiguration insights', () => {
    (useHasMisconfigurations as jest.Mock).mockReturnValue({
      hasMisconfigurationFindings: true,
      passedFindings: 2,
      failedFindings: 1,
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityInsight
          identityFields={{ 'host.name': 'my-host' }}
          openDetailsPanel={mockOpenDetailsPanel}
          entityType="host"
        />
      </TestProviders>
    );

    expect(getByTestId('entityInsightTestSubj')).toBeInTheDocument();
  });

  it('renders the accordion when there are alert insights', () => {
    (useNonClosedAlerts as jest.Mock).mockReturnValue({
      hasNonClosedAlerts: true,
      filteredAlertsData: { open: { total: 3, severities: [] } },
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityInsight
          identityFields={{ 'host.name': 'my-host' }}
          openDetailsPanel={mockOpenDetailsPanel}
          entityType="host"
        />
      </TestProviders>
    );

    expect(getByTestId('entityInsightTestSubj')).toBeInTheDocument();
  });
});
