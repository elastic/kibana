/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { mockAgentIdentity } from './mocks';
import { buildAgentTimelineQuery, Footer } from './footer';

jest.mock('../../../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: jest.fn(() => true),
}));

jest.mock('../../shared/components/take_action', () => ({
  TakeAction: ({ kqlQuery, isDisabled }: { kqlQuery: string; isDisabled?: boolean }) => (
    <div data-test-subj="mockTakeAction" data-disabled={String(!!isDisabled)}>
      {kqlQuery}
    </div>
  ),
}));

describe('buildAgentTimelineQuery', () => {
  it("matches the install's agent, host ID and OS user", () => {
    expect(buildAgentTimelineQuery(mockAgentIdentity)).toBe(
      'process.ai_agent.name: "claude_code" and host.id: "host-1" and user.name: "ec2-user"'
    );
  });

  it('escapes quotes and backslashes in values', () => {
    expect(
      buildAgentTimelineQuery({ ...mockAgentIdentity, userName: 'CORP\\build "svc"' })
    ).toContain('user.name: "CORP\\\\build \\"svc\\""');
  });
});

describe('Footer', () => {
  it('investigates the install in Timeline', () => {
    render(
      <TestProviders>
        <Footer identity={mockAgentIdentity} />
      </TestProviders>
    );
    const takeAction = screen.getByTestId('mockTakeAction');
    expect(takeAction).toHaveTextContent(buildAgentTimelineQuery(mockAgentIdentity));
    expect(takeAction).toHaveAttribute('data-disabled', 'false');
  });

  it('is disabled outside the Security app', () => {
    jest.mocked(useIsInSecurityApp).mockReturnValueOnce(false);
    render(
      <TestProviders>
        <Footer identity={mockAgentIdentity} />
      </TestProviders>
    );
    expect(screen.getByTestId('mockTakeAction')).toHaveAttribute('data-disabled', 'true');
  });
});
