/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { LoggedRequestsPages } from './logged_requests_pages';
import userEvent from '@testing-library/user-event';

const customQueryRuleTypeRequests = [
  {
    request_type: 'findDocuments',
    description: 'request #1',
    request: 'POST test/_search',
    duration: 10,
  },
  {
    request_type: 'findDocuments',
    description: 'request #2',
    request: 'POST test/_search',
    duration: 10,
  },
  {
    request_type: 'findDocuments',
    description: 'request #3',
  },
];

describe('LoggedRequestsPages', () => {
  it('should render 3 pages for query rule', () => {
    render(<LoggedRequestsPages requests={customQueryRuleTypeRequests} ruleType="query" />, {
      wrapper: TestProviders,
    });

    const pages = screen.getAllByTestId('preview-logged-requests-page-accordion');
    expect(pages).toHaveLength(3);
    expect(pages[0]).toHaveTextContent('Page 1 of search queries');
    expect(pages[2]).toHaveTextContent('Page 3 of search queries');
  });

  it('should render 3 pages for saved_query rule', () => {
    render(<LoggedRequestsPages requests={customQueryRuleTypeRequests} ruleType="saved_query" />, {
      wrapper: TestProviders,
    });

    const pages = screen.getAllByTestId('preview-logged-requests-page-accordion');
    expect(pages).toHaveLength(3);
  });

  it('should render 2 pages for threshold rule', () => {
    const requests = [
      {
        request_type: 'findThresholdBuckets',
        description: 'request #1',
        request: 'POST test/_search',
        duration: 10,
      },
      {
        request_type: 'findThresholdBuckets',
        description: 'request #2',
        request: 'POST test/_search',
        duration: 10,
      },
    ];
    render(<LoggedRequestsPages requests={requests} ruleType="threshold" />, {
      wrapper: TestProviders,
    });

    const pages = screen.getAllByTestId('preview-logged-requests-page-accordion');
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveTextContent('Page 1 of search queries');
    expect(pages[1]).toHaveTextContent('Page 2 of search queries');
  });

  it('should render 2 pages for new_terms rule', async () => {
    const requests = [
      {
        request_type: 'findAllTerms',
        description: 'request #1',
        request: 'POST test/_search',
        duration: 10,
      },
      {
        request_type: 'findNewTerms',
        description: 'request #2',
        request: 'POST test/_search',
        duration: 10,
      },
      {
        request_type: 'findDocuments',
        description: 'request #3',
        request: 'POST test/_search',
        duration: 10,
      },
      {
        request_type: 'findAllTerms',
        description: 'request #4',
        request: 'POST test/_search',
        duration: 10,
      },
      {
        request_type: 'findNewTerms',
        description: 'request #5',
        request: 'POST test/_search',
        duration: 10,
      },
    ];
    render(<LoggedRequestsPages requests={requests} ruleType="new_terms" />, {
      wrapper: TestProviders,
    });

    const pages = screen.getAllByTestId('preview-logged-requests-page-accordion');
    expect(pages).toHaveLength(2);

    // renders 3 requests on page 1
    await userEvent.click(screen.getByText('Page 1 of search queries'));
    expect(screen.getAllByTestId('preview-logged-request-code-block')).toHaveLength(3);

    // renders 2 additional requests on page 2
    await userEvent.click(screen.getByText('Page 2 of search queries'));
    expect(screen.getAllByTestId('preview-logged-request-code-block')).toHaveLength(5);
  });
});
