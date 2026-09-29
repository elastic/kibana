/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { TestProviders } from '../../../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { AssetCriticalityLevel } from './asset_criticality_level';

vi.mock('../../../../../common/components/draggables', () => {
      const mocked = {
      DefaultDraggable: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });

const defaultProps = {
  contextId: 'testContext',
  eventId: 'testEvent',
  fieldName: 'testField',
  fieldType: 'testType',
  isAggregatable: true,
  value: 'low_impact',
};

describe('AssetCriticalityLevel', () => {
  it('renders', () => {
    const { getByTestId } = render(<AssetCriticalityLevel {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId('AssetCriticalityLevel-score-badge')).toHaveTextContent('Low Impact');
  });
});
