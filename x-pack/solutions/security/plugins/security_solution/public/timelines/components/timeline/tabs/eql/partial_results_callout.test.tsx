/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EqlShardFailure } from '../../../../containers';
import { PartialResultsCallout } from './partial_results_callout';
import { PARTIAL_RESULTS_WARNING_TITLE } from './translations';

const defaultProps = {
  shardFailures: [] as EqlShardFailure[],
  timedOut: false,
};

describe('PartialResultsCallout', () => {
  it('renders the incomplete search results title', () => {
    render(<PartialResultsCallout {...defaultProps} />);
    expect(screen.getByTestId('eql-partial-results-warning')).toHaveTextContent(
      PARTIAL_RESULTS_WARNING_TITLE
    );
  });

  it('hides the details accordion when there is no failure detail', () => {
    render(<PartialResultsCallout {...defaultProps} />);
    expect(screen.queryByTestId('eql-partial-results-warning-details')).toBeNull();
  });

  it('renders the details accordion when shard failures are present', () => {
    render(
      <PartialResultsCallout
        {...defaultProps}
        shardFailures={[
          {
            index: 'logs-test',
            shard: 0,
            reason: { type: 'script_exception', reason: 'boom' },
          },
        ]}
      />
    );
    expect(screen.getByTestId('eql-partial-results-warning-details')).toBeInTheDocument();
  });

  it('renders the failing index in the details accordion', () => {
    render(
      <PartialResultsCallout
        {...defaultProps}
        shardFailures={[
          {
            index: 'logs-test',
            shard: 0,
            reason: { type: 'script_exception', reason: 'boom' },
          },
        ]}
      />
    );
    expect(screen.getByTestId('eql-partial-results-warning-details')).toHaveTextContent(
      'logs-test'
    );
  });
});
