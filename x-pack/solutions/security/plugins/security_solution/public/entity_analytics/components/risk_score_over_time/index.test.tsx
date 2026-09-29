/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';
import { RiskScoreOverTime } from '.';
import { TestProviders } from '../../../common/mock';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as Mock;
vi.mock('@elastic/charts', () => {
  const original = require('@elastic/charts');
  return {
    ...original,
    LineSeries: vi.fn().mockImplementation(() => <></>),
  };
});

vi.mock('../../../common/hooks/use_experimental_features', () => {
  const mocked = {
    useIsExperimentalFeatureEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/components/visualization_actions/visualization_embeddable');
vi.mock('../../../common/hooks/use_space_id', () => {
  const mocked = {
    useSpaceId: vi.fn().mockReturnValue('default'),
  };
  return { ...mocked, default: mocked };
});

const props = {
  riskEntity: EntityType.host,
  riskScore: [],
  loading: false,
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
  queryId: 'test_query_id',
  title: 'test_query_title',
  toggleStatus: true,
};

describe('Risk Score Over Time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
  });

  it('renders', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreOverTime {...props} />
      </TestProviders>
    );

    expect(queryByTestId('RiskScoreOverTime')).toBeInTheDocument();
  });

  it('renders VisualizationEmbeddable', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreOverTime {...props} />
      </TestProviders>
    );

    expect(queryByTestId('visualization-embeddable')).toBeInTheDocument();
  });
});
