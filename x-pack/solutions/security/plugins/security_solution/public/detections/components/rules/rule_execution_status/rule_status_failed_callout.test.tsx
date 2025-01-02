/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { render } from '@testing-library/react';

import type { RuleExecutionStatus } from '../../../../../common/api/detection_engine/rule_monitoring';
import { RuleExecutionStatusEnum } from '../../../../../common/api/detection_engine/rule_monitoring';
import { RuleStatusFailedCallOut } from './rule_status_failed_callout';
import { AssistantProvider } from '@kbn/elastic-assistant';
import type { AssistantAvailability } from '@kbn/elastic-assistant';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BASE_SECURITY_CONVERSATIONS } from '../../../../assistant/content/conversations';
import type { UserProfileService } from '@kbn/core-user-profile-browser';

jest.mock('../../../../common/lib/kibana');

const TEST_ID = 'ruleStatusFailedCallOut';
const DATE = '2022-01-27T15:03:31.176Z';
const MESSAGE = 'This rule is attempting to query data but...';

const actionTypeRegistry = actionTypeRegistryMock.create();
const mockGetComments = jest.fn(() => []);
const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
const mockNavigationToApp = jest.fn();
const mockAssistantAvailability: AssistantAvailability = {
  hasAssistantPrivilege: false,
  hasConnectorsAllPrivilege: true,
  hasConnectorsReadPrivilege: true,
  hasUpdateAIAssistantAnonymization: true,
  hasManageGlobalKnowledgeBase: true,
  isAssistantEnabled: true,
};
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: () => {},
  },
});

const ContextWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <AssistantProvider
      actionTypeRegistry={actionTypeRegistry}
      assistantAvailability={mockAssistantAvailability}
      augmentMessageCodeBlocks={jest.fn()}
      basePath={'https://localhost:5601/kbn'}
      docLinks={{
        ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
        DOC_LINK_VERSION: 'current',
      }}
      getComments={mockGetComments}
      http={mockHttp}
      navigateToApp={mockNavigationToApp}
      baseConversations={BASE_SECURITY_CONVERSATIONS}
      currentAppId={'security'}
      userProfileService={jest.fn() as unknown as UserProfileService}
    >
      {children}
    </AssistantProvider>
  </QueryClientProvider>
);

describe('RuleStatusFailedCallOut', () => {
  const renderWith = (status: RuleExecutionStatus | null | undefined) =>
    render(<RuleStatusFailedCallOut status={status} date={DATE} message={MESSAGE} />);
  const renderWithAssistant = (status: RuleExecutionStatus | null | undefined) =>
    render(
      <ContextWrapper>
        <RuleStatusFailedCallOut status={status} date={DATE} message={MESSAGE} />{' '}
      </ContextWrapper>
    );
  it('is hidden if status is undefined', () => {
    const result = renderWith(undefined);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is hidden if status is null', () => {
    const result = renderWith(null);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is hidden if status is "going to run"', () => {
    const result = renderWith(RuleExecutionStatusEnum['going to run']);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is hidden if status is "running"', () => {
    const result = renderWith(RuleExecutionStatusEnum.running);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is hidden if status is "succeeded"', () => {
    const result = renderWith(RuleExecutionStatusEnum.succeeded);
    expect(result.queryByTestId(TEST_ID)).toBe(null);
  });

  it('is visible if status is "partial failure"', () => {
    const result = renderWithAssistant(RuleExecutionStatusEnum['partial failure']);
    result.getByTestId(TEST_ID);
    result.getByText('Warning at');
    result.getByText('Jan 27, 2022 @ 15:03:31.176');
    result.getByText(MESSAGE);
  });

  it('is visible if status is "failed"', () => {
    const result = renderWithAssistant(RuleExecutionStatusEnum.failed);
    result.getByTestId(TEST_ID);
    result.getByText('Rule failure at');
    result.getByText('Jan 27, 2022 @ 15:03:31.176');
    result.getByText(MESSAGE);
  });
});
