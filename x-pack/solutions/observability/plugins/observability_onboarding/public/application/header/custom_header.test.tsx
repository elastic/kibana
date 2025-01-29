/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Wrapper } from '../shared/test_wrapper';
import { CustomHeader } from './custom_header';

describe('CustomHeaderSection', () => {
  it('should render the section for logo text', () => {
    const { getByText } = render(
      <CustomHeader
        logo="kubernetes"
        headlineCopy="Setting up Kubernetes with Elastic Agent"
        captionCopy="This installation is tailored for configuring and collecting metrics and logs by deploying a new Elastic Agent within your host"
      />,
      {
        wrapper: Wrapper({ location: '/kubernetes' }),
      }
    );
    expect(getByText('Return')).toBeInTheDocument();
    expect(getByText('Setting up Kubernetes with Elastic Agent')).toBeInTheDocument();
    expect(
      getByText(
        'This installation is tailored for configuring and collecting metrics and logs by deploying a new Elastic Agent within your host'
      )
    );
  });

  it('should render the section for euiIconType text', () => {
    const { getByText, container } = render(
      <CustomHeader
        euiIconType="consoleApp"
        headlineCopy="Auto-detect logs and metrics"
        captionCopy="This installation scans your host and auto-detects log and metric files."
      />,
      {
        wrapper: Wrapper({ location: '/auto-detect?category=infra' }),
      }
    );

    container.querySelector('[data-euiicon-type="consoleApp"]');

    expect(getByText('Return')).toBeInTheDocument();
    expect(getByText('Auto-detect logs and metrics')).toBeInTheDocument();
    expect(getByText('This installation scans your host and auto-detects log and metric files.'));
  });
});
