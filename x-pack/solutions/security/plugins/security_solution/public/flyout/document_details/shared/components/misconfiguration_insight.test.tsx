/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { MisconfigurationsInsight } from './misconfiguration_insight';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { DocumentDetailsContext } from '../context';
import { mockContextValue } from '../mocks/mock_context';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');

const hostName = 'test host';
const testId = 'test';

const openDetailsPanel = jest.fn();

const renderMisconfigurationsInsight = (fieldName: 'host.name' | 'user.name', value: string) => {
  return render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <MisconfigurationsInsight
          name={value}
          fieldName={fieldName}
          data-test-subj={testId}
          openDetailsPanel={openDetailsPanel}
        />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );
};

describe('MisconfigurationsInsight', () => {
  it('renders', () => {
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({
      data: { count: { passed: 1, failed: 2 } },
    });
    const { getByTestId } = renderMisconfigurationsInsight('host.name', hostName);
    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
  });

  it('open entity details panel when clicking on the count', () => {
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({
      data: { count: { passed: 1, failed: 2 } },
    });
    const { getByTestId } = renderMisconfigurationsInsight('host.name', hostName);
    getByTestId(`${testId}-count`).click();
    expect(openDetailsPanel).toHaveBeenCalled();
  });

  it('renders null if no misconfiguration data found', () => {
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({});
    const { container } = renderMisconfigurationsInsight('host.name', hostName);
    expect(container).toBeEmptyDOMElement();
  });
});
