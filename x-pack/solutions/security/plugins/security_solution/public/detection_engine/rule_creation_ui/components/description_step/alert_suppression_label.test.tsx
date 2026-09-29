/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { screen, render } from '@testing-library/react';
import React from 'react';

import { AlertSuppressionLabel } from './alert_suppression_label';

import { isSuppressionRuleInGA } from '../../../../../common/detection_engine/utils';

vi.mock('../../../../common/hooks/use_upselling');
vi.mock('../../../../../common/detection_engine/utils', () => {
      const mocked = {
      isSuppressionRuleInGA: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const isSuppressionRuleInGAMock = isSuppressionRuleInGA as Mock;

describe('component: AlertSuppressionLabel', () => {
  it('should render technical preview when rule type suppression is not in GA', () => {
    isSuppressionRuleInGAMock.mockReturnValue(false);
    render(<AlertSuppressionLabel label="Test label" ruleType="query" />);

    expect(screen.getByText('Technical Preview')).toBeInTheDocument();
  });
  it('should not render technical preview when rule type suppression is in GA', () => {
    isSuppressionRuleInGAMock.mockReturnValue(true);

    render(<AlertSuppressionLabel label="Test label" ruleType="eql" />);

    expect(screen.queryByText('Technical Preview')).not.toBeInTheDocument();
  });
});
