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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { chromeServiceMock } from '@kbn/core/public/mocks';
import { of } from 'rxjs';
import { MockAssistantProviderComponent } from '../../../../common/mock/mock_assistant_provider';

jest.mock('../../../../common/lib/kibana');

const TEST_ID = 'ruleStatusFailedCallOut';
const DATE = '2022-01-27T15:03:31.176Z';
const MESSAGE = 'This rule is attempting to query data but...';

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

const ContextWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const chrome = chromeServiceMock.createStartContract();
  chrome.getChromeStyle$.mockReturnValue(of('classic'));
  return (
    <QueryClientProvider client={queryClient}>
      <MockAssistantProviderComponent>{children}</MockAssistantProviderComponent>
    </QueryClientProvider>
  );
};

describe('RuleStatusFailedCallOut', () => {
  const renderWith = (status: RuleExecutionStatus | null | undefined) =>
    render(
      <RuleStatusFailedCallOut
        status={status}
        date={DATE}
        message={MESSAGE}
        ruleNameForChat="ruleNameForChat"
      />
    );
  const renderWithAssistant = (status: RuleExecutionStatus | null | undefined) =>
    render(
      <ContextWrapper>
        <RuleStatusFailedCallOut
          status={status}
          date={DATE}
          message={MESSAGE}
          ruleNameForChat="ruleNameForChat"
        />{' '}
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
