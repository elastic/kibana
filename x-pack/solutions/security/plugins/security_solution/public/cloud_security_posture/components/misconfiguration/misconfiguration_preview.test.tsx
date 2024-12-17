/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MisconfigurationsPreview } from './misconfiguration_preview';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { TestProviders } from '../../../common/mock/test_providers';

// Mock hooks
jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview');
jest.mock('../../../entity_analytics/api/hooks/use_risk_score');
jest.mock('@kbn/expandable-flyout');

describe('MisconfigurationsPreview', () => {
  const mockOpenLeftPanel = jest.fn();

  beforeEach(() => {
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
      data: { count: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0, UNKNOWN: 0 } },
    });
    (useRiskScore as jest.Mock).mockReturnValue({ data: [{ host: { risk: 75 } }] });
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({
      data: { count: { passed: 1, failed: 1 } },
    });
  });

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MisconfigurationsPreview value="host1" field="host.name" />
      </TestProviders>
    );

    expect(
      getByTestId('securitySolutionFlyoutInsightsMisconfigurationsTitleLink')
    ).toBeInTheDocument();
  });
});
