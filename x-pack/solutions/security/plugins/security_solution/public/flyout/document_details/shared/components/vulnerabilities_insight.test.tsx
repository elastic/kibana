/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { VulnerabilitiesInsight } from './vulnerabilities_insight';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { DocumentDetailsContext } from '../context';
import { mockFlyoutApi } from '../mocks/mock_flyout_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { mockContextValue } from '../mocks/mock_context';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from '../../right/components/host_entity_overview';

jest.mock('@kbn/expandable-flyout');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview');

const hostName = 'test host';
const testId = 'test';

const renderVulnerabilitiesInsight = () => {
  return render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <VulnerabilitiesInsight hostName={hostName} data-test-subj={testId} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );
};

describe('VulnerabilitiesInsight', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('renders', () => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
      data: { count: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0, NONE: 0 } },
    });

    const { getByTestId } = renderVulnerabilitiesInsight();
    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
  });

  it('opens host preview when click on count badge', () => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
      data: { count: { CRITICAL: 1, HIGH: 2, MEDIUM: 1, LOW: 2, NONE: 2 } },
    });
    const { getByTestId } = renderVulnerabilitiesInsight();
    expect(getByTestId(`${testId}-count`)).toHaveTextContent('8');

    getByTestId(`${testId}-count`).click();
    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: HostPreviewPanelKey,
      params: {
        hostName,
        banner: HOST_PREVIEW_BANNER,
        scopeId: mockContextValue.scopeId,
      },
    });
  });

  it('renders null when data is not available', () => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({});

    const { container } = renderVulnerabilitiesInsight();
    expect(container).toBeEmptyDOMElement();
  });
});
