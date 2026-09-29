/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MisconfigurationFindingsDetailsTable } from './misconfiguration_findings_details_table';
import { TestProviders } from '../../../common/mock/test_providers';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';

vi.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => {
  const mocked = {
    uiMetricService: { trackUiMetric: vi.fn() },
    ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS: 'visit',
    NAV_TO_FINDINGS_BY_HOST_NAME_FROM_ENTITY_FLYOUT: 'host_nav',
    NAV_TO_FINDINGS_BY_RULE_NAME_FROM_ENTITY_FLYOUT: 'rule_nav',
  };
  return { ...mocked, default: mocked };
});

const finding = {
  rule: { id: 'rule-1', name: 'Rule One' },
  resource: { id: 'resource-1' },
  result: { evaluation: 'passed' },
};

vi.mock('@kbn/cloud-security-posture', () => {
  const mocked = {
    useMisconfigurationFindings: vi
      .fn()
      .mockReturnValue({ data: { rows: [finding] }, isLoading: false }),
    useHasMisconfigurations: vi.fn().mockReturnValue({ passedFindings: 1, failedFindings: 1 }),
    useGetMisconfigurationStatusColor: vi
      .fn()
      .mockReturnValue({ getMisconfigurationStatusColor: vi.fn().mockReturnValue('#000') }),
    useGetNavigationUrlParams: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')),
    CspEvaluationBadge: ({ type }: { type: string }) => <span>{type}</span>,
    MISCONFIGURATION: { RESULT_EVALUATION: 'result.evaluation', RULE_NAME: 'rule.name' },
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/entity-store/public', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/entity-store/public')),
    useEntityStoreEuidApi: vi.fn().mockReturnValue({ euid: null }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/lib/kibana', () => {
  const mocked = {
    useUiSetting: vi.fn().mockReturnValue(false),
    useKibana: vi.fn().mockReturnValue({ services: {} }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => {
  const mocked = {
    useEntityFromStore: vi.fn().mockReturnValue({ entityRecord: null, isLoading: false }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/components/links', () => {
  const mocked = {
    SecuritySolutionLinkAnchor: ({ children }: { children: React.ReactNode }) => (
      <a href="/">{children}</a>
    ),
  };
  return { ...mocked, default: mocked };
});

const renderTable = (
  onShowFinding: (resourceId: string, ruleId: string, ruleName?: string) => void
) =>
  render(
    <TestProviders>
      <MisconfigurationFindingsDetailsTable
        field={EntityIdentifierFields.hostName}
        value="my-host"
        onShowFinding={onShowFinding}
      />
    </TestProviders>
  );

describe('MisconfigurationFindingsDetailsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes onShowFinding with the row identifiers when the preview action is clicked', () => {
    const onShowFinding = vi.fn();
    renderTable(onShowFinding);

    fireEvent.click(screen.getByRole('button', { name: 'Preview finding details' }));

    expect(onShowFinding).toHaveBeenCalledWith('resource-1', 'rule-1', 'Rule One');
  });
});
