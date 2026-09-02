/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { Content } from './content';

const mockCspBody = jest.fn(() => <div data-test-subj="mockCspFlyoutBody" />);

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      cloudSecurityPosture: {
        getCloudSecurityPostureMisconfigurationFlyout: () => ({
          Body: mockCspBody,
        }),
      },
    },
  }),
}));

const finding = { rule: { name: 'My Rule' } } as unknown as CspFinding;

describe('<Content /> (misconfiguration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the CSP finding body', () => {
    const { getByTestId } = render(<Content finding={finding} />);
    expect(getByTestId('mockCspFlyoutBody')).toBeInTheDocument();
  });
});
