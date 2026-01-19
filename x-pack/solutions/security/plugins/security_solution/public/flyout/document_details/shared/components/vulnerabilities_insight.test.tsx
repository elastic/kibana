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
import { mockContextValue } from '../mocks/mock_context';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview');

const hostName = 'test host';
const testId = 'test';
const openDetailsPanel = jest.fn();

const renderVulnerabilitiesInsight = () => {
  return render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <VulnerabilitiesInsight
          hostName={hostName}
          data-test-subj={testId}
          openDetailsPanel={openDetailsPanel}
        />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );
};

describe('VulnerabilitiesInsight', () => {
  it('renders', () => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
      data: { count: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0, NONE: 0 } },
    });

    const { getByTestId } = renderVulnerabilitiesInsight();
    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
  });

  it('open entity details panel when clicking on the count', () => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
      data: { count: { CRITICAL: 1, HIGH: 2, MEDIUM: 1, LOW: 2, NONE: 2 } },
    });
    const { getByTestId } = renderVulnerabilitiesInsight();
    getByTestId(`${testId}-count`).click();
    expect(openDetailsPanel).toHaveBeenCalled();
  });

  it('renders null when data is not available', () => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({});

    const { container } = renderVulnerabilitiesInsight();
    expect(container).toBeEmptyDOMElement();
  });
});
