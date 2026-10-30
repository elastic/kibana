/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AggregatedFeature, Feature } from '@kbn/significant-events-schema';
import { useDeveloperMode } from '../../../../hooks/use_developer_mode';
import { KnowledgeIndicatorFeatureDetailsContent } from './knowledge_indicator_feature_details_content';

jest.mock('../../../../hooks/use_developer_mode');

const mockUseDeveloperMode = useDeveloperMode as jest.MockedFunction<typeof useDeveloperMode>;

const baseFeature: Feature = {
  id: 'feature-id',
  uuid: 'feature-uuid',
  source_id: 'logs.test',
  type: 'dependency',
  description: 'A service dependency',
  properties: { source: 'service-a', target: 'service-b' },
  confidence: 74,
  evidence: ['service.name=service-a'],
  meta: { note: 'Inferred from logs' },
  updated_at: new Date().toISOString(),
};

const feature: AggregatedFeature = {
  ...baseFeature,
  sources: ['logs.test'],
  instances: [baseFeature],
};

const otherInstance: Feature = {
  ...baseFeature,
  uuid: 'other-uuid',
  source_id: 'logs.other',
  confidence: 51,
  description: 'Seen from the other source',
  expires_at: new Date(Date.now() + 864e5).toISOString(),
};

const multiSourceFeature: AggregatedFeature = {
  ...feature,
  sources: ['logs.other', 'logs.test'],
  instances: [baseFeature, otherInstance],
};

const getSourceTitle = (sourceId: string) => `title:${sourceId}`;

const setDeveloperMode = jest.fn();
const onSelectInstance = jest.fn();

const renderContent = (isDeveloperMode: boolean) => {
  mockUseDeveloperMode.mockReturnValue({ isDeveloperMode, isSaving: false, setDeveloperMode });
  return render(
    <KnowledgeIndicatorFeatureDetailsContent
      feature={feature}
      getSourceTitle={getSourceTitle}
      onSelectInstance={onSelectInstance}
    />
  );
};

describe('KnowledgeIndicatorFeatureDetailsContent', () => {
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
    rerender(
      <KnowledgeIndicatorFeatureDetailsContent
        feature={feature}
        getSourceTitle={getSourceTitle}
        onSelectInstance={onSelectInstance}
      />
    );

    expect(
      screen.queryByTestId('significantEventsAppFeatureDetailsFlyoutMeta')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('significantEventsAppFeatureDetailsFlyoutRawDocument')
    ).not.toBeInTheDocument();
  });

  it('lists every source only when the feature spans several', () => {
    const { rerender } = renderContent(false);
    expect(
      screen.queryByTestId('significantEventsAppFeatureDetailsFlyoutSources')
    ).not.toBeInTheDocument();

    rerender(
      <KnowledgeIndicatorFeatureDetailsContent
        feature={multiSourceFeature}
        getSourceTitle={getSourceTitle}
        onSelectInstance={onSelectInstance}
      />
    );

    const sources = screen.getByTestId('significantEventsAppFeatureDetailsFlyoutSources');
    expect(sources).toHaveTextContent('title:logs.test');
    expect(sources).toHaveTextContent('title:logs.other');
    expect(sources).toHaveTextContent('51');
    expect(sources).toHaveTextContent('Expiring');
  });

  it('marks the viewed source and lets the user pick another instance', () => {
    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: false,
      isSaving: false,
      setDeveloperMode,
    });
    render(
      <KnowledgeIndicatorFeatureDetailsContent
        feature={multiSourceFeature}
        getSourceTitle={getSourceTitle}
        onSelectInstance={onSelectInstance}
      />
    );

    expect(
      screen.getByTestId('significantEventsAppFeatureDetailsFlyoutSource-feature-uuid')
    ).toHaveAttribute('aria-current', 'true');
    expect(screen.queryByRole('button', { name: 'title:logs.test' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'title:logs.other' }));
    expect(onSelectInstance).toHaveBeenCalledWith('other-uuid');
  });
});
