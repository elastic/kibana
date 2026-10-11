/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Feature } from '@kbn/significant-events-schema';
import { useDeveloperMode } from '../../../hooks/use_developer_mode';
import { KnowledgeIndicatorFeatureDetailsContent } from './knowledge_indicator_feature_details_content';

jest.mock('../../../hooks/use_developer_mode');

const mockUseDeveloperMode = useDeveloperMode as jest.MockedFunction<typeof useDeveloperMode>;

const feature: Feature = {
  id: 'feature-id',
  uuid: 'feature-uuid',
  stream_name: 'logs.test',
  type: 'dependency',
  description: 'A service dependency',
  properties: { source: 'service-a', target: 'service-b' },
  confidence: 74,
  evidence: ['service.name=service-a'],
  meta: { note: 'Inferred from logs' },
  updated_at: new Date().toISOString(),
};

const setDeveloperMode = jest.fn();

const renderContent = (isDeveloperMode: boolean) => {
  mockUseDeveloperMode.mockReturnValue({ isDeveloperMode, isSaving: false, setDeveloperMode });
  return render(<KnowledgeIndicatorFeatureDetailsContent feature={feature} />);
};

describe('KnowledgeIndicatorFeatureDetailsContent', () => {
  it('hides meta and raw document while developer mode is off', () => {
    renderContent(false);

    expect(screen.getByText('A service dependency')).toBeInTheDocument();
    expect(screen.getByText('service.name=service-a')).toBeInTheDocument();
    expect(
      screen.queryByTestId('significantEventsAppFeatureDetailsFlyoutMeta')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('significantEventsAppFeatureDetailsFlyoutRawDocument')
    ).not.toBeInTheDocument();
  });

  it('shows meta and raw document only while developer mode is on', () => {
    const { rerender } = renderContent(true);

    expect(screen.getByTestId('significantEventsAppFeatureDetailsFlyoutMeta')).toHaveTextContent(
      'Inferred from logs'
    );
    expect(screen.getByTestId('significantEventsAppFeatureDetailsFlyoutMeta')).toHaveTextContent(
      'Dev'
    );
    expect(
      screen.getByTestId('significantEventsAppFeatureDetailsFlyoutRawDocument')
    ).toHaveTextContent('feature-uuid');
    expect(
      screen.getByTestId('significantEventsAppFeatureDetailsFlyoutRawDocument')
    ).toHaveTextContent('Dev');

    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: false,
      isSaving: false,
      setDeveloperMode,
    });
    rerender(<KnowledgeIndicatorFeatureDetailsContent feature={feature} />);

    expect(
      screen.queryByTestId('significantEventsAppFeatureDetailsFlyoutMeta')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('significantEventsAppFeatureDetailsFlyoutRawDocument')
    ).not.toBeInTheDocument();
  });
});
