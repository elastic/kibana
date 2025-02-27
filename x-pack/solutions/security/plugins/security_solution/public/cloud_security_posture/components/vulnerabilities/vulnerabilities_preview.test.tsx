/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { VulnerabilitiesPreview } from './vulnerabilities_preview';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { TestProviders } from '../../../common/mock/test_providers';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';

// Mock hooks
jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview');

describe('VulnerabilitiesPreview', () => {
  const mockOpenLeftPanel = jest.fn();

  beforeEach(() => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
      data: { count: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0, UNKNOWN: 0 } },
    });
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({
      data: { count: { passed: 1, failed: 1 } },
    });
  });

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <VulnerabilitiesPreview
          value="host1"
          field={EntityIdentifierFields.hostName}
          isLinkEnabled={true}
          openDetailsPanel={mockOpenLeftPanel}
        />
      </TestProviders>
    );

    expect(
      getByTestId('securitySolutionFlyoutInsightsVulnerabilitiesTitleLink')
    ).toBeInTheDocument();
  });
});
