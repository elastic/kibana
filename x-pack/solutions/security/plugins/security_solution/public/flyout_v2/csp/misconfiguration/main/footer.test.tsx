/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Footer } from './footer';

const mockCreateRuleFn = jest.fn();
const mockCspTakeAction = jest.fn(() => <div data-test-subj="mockCspTakeAction" />);
const MockCspComponent = ({
  children,
}: {
  children: (props: { createRuleFn: unknown }) => React.ReactNode;
}) => <>{children({ createRuleFn: mockCreateRuleFn })}</>;

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      cloudSecurityPosture: {
        getCloudSecurityPostureMisconfigurationFlyout: () => ({
          Component: MockCspComponent,
          TakeAction: mockCspTakeAction,
        }),
      },
    },
  }),
}));

describe('<Footer /> (misconfiguration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the take action control with a create-rule function', () => {
    const { getByTestId } = render(<Footer resourceId="resource-1" ruleId="rule-1" />);
    expect(getByTestId('mockCspTakeAction')).toBeInTheDocument();
    expect(mockCspTakeAction).toHaveBeenCalledWith(
      expect.objectContaining({ createRuleFn: mockCreateRuleFn }),
      expect.anything()
    );
  });
});
