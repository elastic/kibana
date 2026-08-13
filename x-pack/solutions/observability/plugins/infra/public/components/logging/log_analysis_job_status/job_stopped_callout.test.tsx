/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { JobStoppedCallout } from './job_stopped_callout';

const renderCallout = (stoppedJobNames: readonly string[]) =>
  renderWithKibanaRenderContext(<JobStoppedCallout stoppedJobNames={stoppedJobNames} />);

describe('JobStoppedCallout', () => {
  it('renders nothing when there are no stopped jobs', () => {
    renderCallout([]);

    expect(screen.queryByText('ML job stopped')).not.toBeInTheDocument();
    expect(screen.queryByText('ML jobs stopped')).not.toBeInTheDocument();
  });

  it('renders a singular title and message for a single stopped job', () => {
    renderCallout(['Log rate']);

    expect(screen.getByText('ML job stopped')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The Log rate ML job has been stopped manually or due to a lack of resources. New log entries will not be processed until the job has been restarted.'
      )
    ).toBeInTheDocument();
  });

  it('renders a plural title and enumerates the jobs for multiple stopped jobs', () => {
    renderCallout(['Log rate', 'Categorization']);

    expect(screen.getByText('ML jobs stopped')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The following ML jobs have been stopped manually or due to a lack of resources: Log rate and Categorization. New log entries will not be processed until the jobs have been restarted.'
      )
    ).toBeInTheDocument();
  });
});
