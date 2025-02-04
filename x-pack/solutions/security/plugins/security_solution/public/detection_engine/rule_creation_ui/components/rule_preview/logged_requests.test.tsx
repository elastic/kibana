/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../../../common/mock/test_providers';
import { LoggedRequests } from './logged_requests';

import { previewLogs, queryRuleTypePreviewLogs } from './__mocks__/preview_logs';

describe('LoggedRequests', () => {
  it('should not render component if logs are empty', () => {
    render(<LoggedRequests logs={[]} ruleType="esql" />, { wrapper: TestProviders });

    expect(screen.queryByTestId('preview-logged-requests-accordion')).toBeNull();
  });

  it('should open accordion on click and render list of request items', async () => {
    render(<LoggedRequests logs={previewLogs} ruleType="esql" />, { wrapper: TestProviders });

    expect(screen.queryByTestId('preview-logged-requests-accordion')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Preview logged requests'));

    expect(screen.getAllByTestId('preview-logged-requests-item-accordion')).toHaveLength(3);
  });

  it('should render code content on logged request item accordion click', async () => {
    render(<LoggedRequests logs={previewLogs} ruleType="esql" />, { wrapper: TestProviders });

    expect(screen.queryByTestId('preview-logged-requests-accordion')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Preview logged requests'));

    // picking up second rule execution
    const loggedRequestsItem = screen.getAllByTestId('preview-logged-requests-item-accordion')[1];

    expect(loggedRequestsItem).toHaveTextContent('Rule execution started at');
    expect(loggedRequestsItem).toHaveTextContent('[269ms]');

    await userEvent.click(loggedRequestsItem.querySelector('button') as HTMLElement);

    expect(screen.getAllByTestId('preview-logged-request-description')).toHaveLength(6);
    expect(screen.getAllByTestId('preview-logged-request-code-block')).toHaveLength(6);

    expect(screen.getAllByTestId('preview-logged-request-description')[0]).toHaveTextContent(
      'ES|QL request to find all matches [30ms]'
    );

    expect(screen.getAllByTestId('preview-logged-request-code-block')[0]).toHaveTextContent(
      /FROM packetbeat-8\.14\.2 metadata _id, _version, _index \| limit 101/
    );

    expect(screen.getAllByTestId('preview-logged-request-description')[1]).toHaveTextContent(
      'Retrieve source documents when ES|QL query is not aggregable'
    );

    expect(screen.getAllByTestId('preview-logged-request-code-block')[1]).toHaveTextContent(
      /POST \/packetbeat-8\.14\.2\/_search\?ignore_unavailable=true/
    );
  });

  it('should render code content when rule supports page view', async () => {
    render(<LoggedRequests logs={queryRuleTypePreviewLogs} ruleType="query" />, {
      wrapper: TestProviders,
    });

    expect(screen.queryByTestId('preview-logged-requests-accordion')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Preview logged requests'));

    const loggedRequestsItem = screen.getAllByTestId('preview-logged-requests-item-accordion')[0];

    expect(loggedRequestsItem).toHaveTextContent('Rule execution started at');
    expect(loggedRequestsItem).toHaveTextContent('[1103ms]');

    await userEvent.click(loggedRequestsItem.querySelector('button') as HTMLElement);

    expect(screen.getAllByTestId('preview-logged-requests-page-accordion')).toHaveLength(2);

    await userEvent.click(screen.getByText('Page 1 of search queries'));

    expect(screen.getAllByTestId('preview-logged-request-description')[0]).toHaveTextContent(
      'Find documents [137ms]'
    );
    expect(screen.getAllByTestId('preview-logged-request-code-block')[0]).toHaveTextContent(
      'POST /apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*,very-unique/_search?allow_no_indices=true&ignore_unavailable=true'
    );
  });
});
