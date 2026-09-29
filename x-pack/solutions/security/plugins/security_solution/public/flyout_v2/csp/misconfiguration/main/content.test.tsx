/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { Content } from './content';

const mockCspBody = vi.fn(() => <div data-test-subj="mockCspFlyoutBody" />);

vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          cloudSecurityPosture: {
            getCloudSecurityPostureMisconfigurationFlyout: () => ({
              Body: mockCspBody,
            }),
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

const finding = { rule: { name: 'My Rule' } } as unknown as CspFinding;

describe('<Content /> (misconfiguration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the CSP finding body', () => {
    const { getByTestId } = render(<Content finding={finding} />);
    expect(getByTestId('mockCspFlyoutBody')).toBeInTheDocument();
  });
});
