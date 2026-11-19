/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MisconfigurationsPreview } from './misconfiguration_preview';
import { TestProviders } from '../../../common/mock/test_providers';

describe('MisconfigurationsPreview', () => {
  const mockOpenDetailsPanel = jest.fn();

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MisconfigurationsPreview
          isPreviewMode={false}
          passedFindings={1}
          failedFindings={1}
          openDetailsPanel={mockOpenDetailsPanel}
        />
      </TestProviders>
    );

    expect(
      getByTestId('securitySolutionFlyoutInsightsMisconfigurationsTitleLink')
    ).toBeInTheDocument();
  });
});
