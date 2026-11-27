/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../../use_flyout_api.mock';
import type { RelatedEntity } from '../../../../../entity_analytics/components/ai_security/types';
import { mockAgentContext } from '../mocks';
import { RelatedAgentsSection } from './related_agents_section';
import { AI_AGENT_TEST_IDS } from '../test_ids';

jest.mock('../../../../use_flyout_api');

const { otherInstallsOnAccount, otherAgentsOnHost } = mockAgentContext;

const renderSection = ({
  sameAccount = otherInstallsOnAccount,
  sameHost = otherAgentsOnHost,
  isOpen = true,
  onToggle = jest.fn(),
}: {
  sameAccount?: readonly RelatedEntity[];
  sameHost?: readonly RelatedEntity[];
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
} = {}) =>
  render(
    <TestProviders>
      <RelatedAgentsSection
        sameAccount={sameAccount}
        sameHost={sameHost}
        scopeId="scope"
        isOpen={isOpen}
        onToggle={onToggle}
      />
    </TestProviders>
  );

describe('RelatedAgentsSection', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('counts the related installs in the title and lists them by account and by host', () => {
    renderSection();
    expect(screen.getByText('Related agents (2)')).toBeInTheDocument();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sameAccount)).toHaveTextContent(
      'Same accountClaude Code · aquinn · dev-laptop-02Low'
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sameHost)).toHaveTextContent(
      'Same hostCursor · ec2-user · ci-build-01'
    );
  });

  it('counts an install that is on both lists once', () => {
    renderSection({ sameHost: [...otherAgentsOnHost, ...otherInstallsOnAccount] });
    expect(screen.getByText('Related agents (2)')).toBeInTheDocument();
  });

  it('shows related risk as a level, not a pill', () => {
    renderSection();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sameAccount)).not.toHaveTextContent('Risk:');
  });

  it('leaves out an empty list', () => {
    renderSection({ sameHost: [] });
    expect(screen.getByText('Related agents (1)')).toBeInTheDocument();
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.sameHost)).not.toBeInTheDocument();
  });

  it('renders nothing when there are no related agents', () => {
    renderSection({ sameAccount: [], sameHost: [] });
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.relatedAgents)).not.toBeInTheDocument();
  });

  it('is controlled by its parent', () => {
    const onToggle = jest.fn();
    renderSection({ isOpen: false, onToggle });
    fireEvent.click(screen.getByTestId(AI_AGENT_TEST_IDS.relatedAgentsToggle));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('opens a related install as a child flyout', () => {
    renderSection();
    fireEvent.click(screen.getByText('Claude Code · aquinn · dev-laptop-02'));
    expect(flyoutApi.openEntityDetailsAsChild).toHaveBeenCalledWith(
      expect.objectContaining({
        engineType: 'ai_agent',
        entityId: 'ai_agent:claude_code@host-2@aquinn',
      })
    );
  });
});
