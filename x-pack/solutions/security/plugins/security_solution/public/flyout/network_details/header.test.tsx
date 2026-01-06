/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { PanelHeader } from './header';
import { FlowTargetSourceDest } from '../../../common/search_strategy';

const mockProps = {
  ip: '192.168.1.1/24',
  flowTarget: FlowTargetSourceDest.source,
};

jest.mock('../../common/components/links', () => {
  const originalModule = jest.requireActual('../../common/components/links');
  return {
    ...originalModule,
    SecuritySolutionLinkAnchor: jest.fn(({ children, path }) => <a href={path}>{children}</a>),
  };
});

describe('<PanelHeader />', () => {
  it('should check for href value of the anchor element', () => {
    const { container } = render(
      <TestProviders>
        <PanelHeader {...mockProps} />
      </TestProviders>
    );

    const anchor = container.querySelector('a');
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute('href', '/ip/192.168.1.1%2F24/source/events');
  });

  it('should verify the flyout title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <PanelHeader {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('network-details-flyout-headerText')).toHaveTextContent('192.168.1.1/24');
  });
});
