/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { useProcessData } from '../hooks/use_process_data';
import { SessionPreview } from './session_preview';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { SESSION_PREVIEW_RULE_DETAILS_LINK_TEST_ID } from './test_ids';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';

jest.mock('../hooks/use_process_data');
jest.mock('../../shared/hooks/use_rule_details_link');

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  browserFields: {},
  dataFormattedForFieldBrowser: [],
} as unknown as DocumentDetailsContext;

const renderSessionPreview = () =>
  render(
    <TestProviders>
      <TestProvider>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <SessionPreview />
        </DocumentDetailsContext.Provider>
      </TestProvider>
    </TestProviders>
  );

describe('SessionPreview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders session preview with all data', () => {
    jest.mocked(useProcessData).mockReturnValue({
      processName: 'process1',
      userName: 'user1',
      startAt: '2022-01-01T00:00:00.000Z',
      ruleName: 'rule1',
      ruleId: 'id',
      workdir: '/path/to/workdir',
      command: 'command1',
    });
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule1_link');

    renderSessionPreview();

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('started')).toBeInTheDocument();
    expect(screen.getByText('process1')).toBeInTheDocument();
    expect(screen.getByText('at')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2022 @ 00:00:00.000')).toBeInTheDocument();
    expect(screen.getByText('with rule')).toBeInTheDocument();
    expect(screen.getByTestId(SESSION_PREVIEW_RULE_DETAILS_LINK_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('rule1')).toBeInTheDocument();
    expect(screen.getByText('by')).toBeInTheDocument();
    expect(screen.getByText('/path/to/workdir command1')).toBeInTheDocument();
  });

  it('renders session preview without optional data', () => {
    jest.mocked(useProcessData).mockReturnValue({
      processName: 'process1',
      userName: 'user1',
      startAt: null,
      ruleName: null,
      ruleId: null,
      command: null,
      workdir: null,
    });
    (useRuleDetailsLink as jest.Mock).mockReturnValue(null);

    renderSessionPreview();

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('started')).toBeInTheDocument();
    expect(screen.getByText('process1')).toBeInTheDocument();
    expect(screen.queryByText('at')).not.toBeInTheDocument();
    expect(screen.queryByText('with rule')).not.toBeInTheDocument();
    expect(screen.queryByTestId(SESSION_PREVIEW_RULE_DETAILS_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByText('by')).not.toBeInTheDocument();
  });
});
