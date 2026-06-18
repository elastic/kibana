/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { VulnerabilitiesPreview } from './vulnerabilities_preview';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { TestProviders } from '../../../../common/mock/test_providers';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview');

describe('VulnerabilitiesPreview (v2)', () => {
  const mockOpenDetailsPanel = jest.fn();

  beforeEach(() => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
      data: { count: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0, UNKNOWN: 0 } },
    });
  });

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <VulnerabilitiesPreview
          identityFields={{ 'host.name': 'host1' }}
          openDetailsPanel={mockOpenDetailsPanel}
        />
      </TestProviders>
    );

    expect(
      getByTestId('securitySolutionFlyoutInsightsVulnerabilitiesTitleLink')
    ).toBeInTheDocument();
  });
});
