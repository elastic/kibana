/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { RulesCard } from './rules_card';
import { TestProviders } from '../../../../../common/mock';

const props = {
  setComplete: jest.fn(),
  checkComplete: jest.fn(),
  isCardComplete: jest.fn(),
  isCardAvailable: jest.fn(),
  setExpandedCardId: jest.fn(),
};

describe('RulesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('description should be in the document', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RulesCard {...props} />
      </TestProviders>
    );

    expect(getByTestId('rulesCardDescription')).toBeInTheDocument();
  });

  it('card callout should be rendered if integrations card is available but not complete', () => {
    props.isCardAvailable.mockReturnValueOnce(true);
    props.isCardComplete.mockReturnValueOnce(false);

    const { getByText } = render(
      <TestProviders>
        <RulesCard {...props} />
      </TestProviders>
    );

    expect(getByText('To add Elastic rules add integrations first.')).toBeInTheDocument();
  });

  it('card callout should not be rendered if integrations card is not available', () => {
    props.isCardAvailable.mockReturnValueOnce(false);

    const { queryByText } = render(
      <TestProviders>
        <RulesCard {...props} />
      </TestProviders>
    );

    expect(queryByText('To add Elastic rules add integrations first.')).not.toBeInTheDocument();
  });

  it('card button should be disabled if integrations card is available but not complete', () => {
    props.isCardAvailable.mockReturnValueOnce(true);
    props.isCardComplete.mockReturnValueOnce(false);

    const { getByTestId } = render(
      <TestProviders>
        <RulesCard {...props} />
      </TestProviders>
    );

    expect(getByTestId('rulesCardButton').querySelector('button')).toBeDisabled();
  });

  it('card button should be enabled if integrations card is complete', () => {
    props.isCardAvailable.mockReturnValueOnce(true);
    props.isCardComplete.mockReturnValueOnce(true);

    const { getByTestId } = render(
      <TestProviders>
        <RulesCard {...props} />
      </TestProviders>
    );

    expect(getByTestId('rulesCardButton').querySelector('button')).not.toBeDisabled();
  });
});
