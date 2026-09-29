/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import { mockAnomalies } from '../../../../common/components/ml/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { AnomaliesField } from './anomalies_field';
import { TestProviders } from '../../../../common/mock';

vi.mock('../../../../common/components/cell_actions', async () => {
  const actual = await vi.importActual('../../../../common/components/cell_actions');
  return {
    ...actual,
    SecurityCellActions: () => <></>,
  };
});

describe('getAnomaliesFields', () => {
  it('returns max anomaly score', () => {
    const { getByTestId } = render(
      <AnomaliesField
        anomalies={{ isLoading: false, anomalies: mockAnomalies, jobNameById: {} }}
      />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getByTestId('anomaly-scores')).toBeInTheDocument();
  });
});
