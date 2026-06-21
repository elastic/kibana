/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock/test_providers';
import type { RulePreviewLogs } from '../../../../../common/api/detection_engine';
import { PreviewLogs } from './preview_logs';

const buildLog = (overrides: Partial<RulePreviewLogs> = {}): RulePreviewLogs => ({
  errors: [],
  warnings: [],
  startedAt: '2024-09-05T15:43:46.972Z',
  duration: 100,
  requests: [],
  ...overrides,
});

const renderPreviewLogs = (logs: RulePreviewLogs[]) =>
  render(
    <PreviewLogs
      logs={logs}
      hasNoiseWarning={false}
      isAborted={false}
      showElasticsearchRequests={false}
      ruleType="query"
    />,
    { wrapper: TestProviders }
  );

describe('PreviewLogs', () => {
  const MAX_ALERTS_WARNING =
    'This rule reached the maximum alert limit for the rule execution. Some alerts were not created.';

  it('renders a single warning callout when the same warning is reported by multiple invocations', () => {
    const logs = [
      buildLog({ warnings: [MAX_ALERTS_WARNING], startedAt: '2024-09-05T15:43:46.972Z' }),
      buildLog({ warnings: [MAX_ALERTS_WARNING], startedAt: '2024-09-05T16:03:46.972Z' }),
      buildLog({ warnings: [MAX_ALERTS_WARNING], startedAt: '2024-09-05T16:23:46.972Z' }),
    ];

    renderPreviewLogs(logs);

    expect(screen.getAllByTestId('preview-warning')).toHaveLength(1);
    expect(screen.getAllByText(MAX_ALERTS_WARNING)).toHaveLength(1);
    // No "see all warnings" accordion is needed when only one unique warning remains.
    expect(screen.queryByTestId('previewWarningAccordion')).not.toBeInTheDocument();
  });

  it('renders a single error callout when the same error is reported by multiple invocations', () => {
    const errorMessage = 'Query execution failed.';
    const logs = [
      buildLog({ errors: [errorMessage], startedAt: '2024-09-05T15:43:46.972Z' }),
      buildLog({ errors: [errorMessage], startedAt: '2024-09-05T16:03:46.972Z' }),
    ];

    renderPreviewLogs(logs);

    expect(screen.getAllByTestId('preview-error')).toHaveLength(1);
    expect(screen.getAllByText(errorMessage)).toHaveLength(1);
  });

  it('keeps distinct warnings from different invocations', () => {
    const logs = [
      buildLog({ warnings: ['First unique warning'], startedAt: '2024-09-05T15:43:46.972Z' }),
      buildLog({ warnings: ['Second unique warning'], startedAt: '2024-09-05T16:03:46.972Z' }),
    ];

    renderPreviewLogs(logs);

    expect(screen.getAllByTestId('preview-warning')).toHaveLength(2);
    expect(screen.getByText('First unique warning')).toBeInTheDocument();
    expect(screen.getByText('Second unique warning')).toBeInTheDocument();
  });
});
