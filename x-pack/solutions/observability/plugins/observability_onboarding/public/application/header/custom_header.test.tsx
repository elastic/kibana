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

let mockIsSmallScreen = false;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinBreakpoints: (breakpoints: string[]) => {
      // Return true if mocking small screen and checking for xs/s breakpoints
      if (mockIsSmallScreen && (breakpoints.includes('xs') || breakpoints.includes('s'))) {
        return true;
      }
      return false;
    },
  };
});

describe('CustomHeaderSection', () => {
  beforeEach(() => {
    mockIsSmallScreen = false;
  });

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

  describe('responsive behavior', () => {
    it('should render with larger logo on large screens', () => {
      mockIsSmallScreen = false;
      const { container } = render(
        <CustomHeader logo="kubernetes" headlineCopy="Test Headline" captionCopy="Test caption" />,
        {
          wrapper: Wrapper({ location: '/kubernetes' }),
        }
      );

      const logoElement = container.querySelector('[data-euiicon-type="logoKubernetes"]');
      expect(logoElement).toBeInTheDocument();
      // On large screens, logo should have 56px dimensions
      const logoStyles = logoElement?.closest('div')?.querySelector('span');
      expect(logoStyles).toHaveStyle({ width: '56px', height: '56px' });
    });

    it('should render with smaller logo on small screens', () => {
      mockIsSmallScreen = true;
      const { container, rerender } = render(
        <CustomHeader logo="kubernetes" headlineCopy="Test Headline" captionCopy="Test caption" />,
        {
          wrapper: Wrapper({ location: '/kubernetes' }),
        }
      );

      // Force re-render to pick up the mock change
      rerender(
        <CustomHeader logo="kubernetes" headlineCopy="Test Headline" captionCopy="Test caption" />
      );

      const logoElement = container.querySelector('[data-euiicon-type="logoKubernetes"]');
      expect(logoElement).toBeInTheDocument();
      // On small screens, logo should have 40px dimensions
      const logoStyles = logoElement?.closest('div')?.querySelector('span');
      expect(logoStyles).toHaveStyle({ width: '40px', height: '40px' });
    });
  });
});
