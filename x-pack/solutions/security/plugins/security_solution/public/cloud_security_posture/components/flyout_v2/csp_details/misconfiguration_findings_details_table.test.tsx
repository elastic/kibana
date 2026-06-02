/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MisconfigurationFindingsDetailsTable } from './misconfiguration_findings_details_table';
import { TestProviders } from '../../../../common/mock/test_providers';
import { EntityIdentifierFields } from '../../../../../common/entity_analytics/types';

jest.mock('@kbn/cloud-security-posture', () => ({
  useMisconfigurationFindings: jest.fn().mockReturnValue({ data: { page: [] }, isLoading: false }),
  useHasMisconfigurations: jest.fn().mockReturnValue({
    hasMisconfigurationFindings: false,
    passedFindings: 0,
    failedFindings: 0,
  }),
  useGetMisconfigurationStatusColor: jest.fn().mockReturnValue({
    getMisconfigurationStatusColor: jest.fn().mockReturnValue('#000'),
  }),
  useGetNavigationUrlParams: jest.fn().mockReturnValue(jest.fn().mockReturnValue('')),
  CspEvaluationBadge: ({ type }: { type: string }) => <span>{type}</span>,
  MISCONFIGURATION: { RESULT_EVALUATION: 'result.evaluation', RULE_NAME: 'rule.name' },
}));

jest.mock('@kbn/entity-store/public', () => ({
  ...jest.requireActual('@kbn/entity-store/public'),
  useEntityStoreEuidApi: jest.fn().mockReturnValue({ euid: null }),
}));

jest.mock('../../../../common/lib/kibana', () => ({
  useUiSetting: jest.fn().mockReturnValue(false),
  useKibana: jest.fn().mockReturnValue({ services: {} }),
}));

jest.mock('../../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => ({
  useEntityFromStore: jest.fn().mockReturnValue({ entityRecord: null, isLoading: false }),
}));

jest.mock('../../../../common/components/links', () => ({
  SecuritySolutionLinkAnchor: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
}));

describe('MisconfigurationFindingsDetailsTable (v2)', () => {
  const mockOnShowFinding = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MisconfigurationFindingsDetailsTable
          field={EntityIdentifierFields.hostName}
          value="my-host"
          scopeId="scope-id"
          onShowFinding={mockOnShowFinding}
        />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutMisconfigurationFindingsTable')).toBeInTheDocument();
  });

  it('accepts required onShowFinding callback without throwing', () => {
    expect(() =>
      render(
        <TestProviders>
          <MisconfigurationFindingsDetailsTable
            field={EntityIdentifierFields.hostName}
            value="my-host"
            scopeId="scope-id"
            entityId="host-entity-id"
            entityType="host"
            onShowFinding={mockOnShowFinding}
          />
        </TestProviders>
      )
    ).not.toThrow();
  });
});
