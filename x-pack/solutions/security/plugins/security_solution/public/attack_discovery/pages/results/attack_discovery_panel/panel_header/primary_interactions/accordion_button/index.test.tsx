/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AccordionButton } from '.';

jest.mock('../../../../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
      },
    }),
  };
});

describe('AccordionButton', () => {
  const title = 'Malware Delivery and Credentials Access on macOS';

  it('renders the assistant avatar', () => {
    render(<AccordionButton isLoading={false} title={title} />);
    const assistantAvatar = screen.getByTestId('assistantAvatar');

    expect(assistantAvatar).toBeInTheDocument();
  });

  it('renders the expected title', () => {
    render(<AccordionButton isLoading={false} title={title} />);
    const titleText = screen.getByTestId('titleText');

    expect(titleText).toHaveTextContent(title);
  });

  it('renders the skeleton title when isLoading is true', () => {
    render(<AccordionButton isLoading={true} title={title} />);
    const skeletonTitle = screen.getByTestId('skeletonTitle');

    expect(skeletonTitle).toBeInTheDocument();
  });
});
