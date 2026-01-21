/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MissingLookupsList } from '.';
import { TestProviders } from '../../../../../../common/mock';

describe('MissingLookupsList', () => {
  const omitLookup = jest.fn();
  const onCopied = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component', () => {
    const { getByText } = render(
      <TestProviders>
        <MissingLookupsList
          missingLookups={['lookup1', 'lookup2']}
          uploadedLookups={{}}
          omitLookup={omitLookup}
          onCopied={onCopied}
        />
      </TestProviders>
    );
    expect(getByText('lookup1')).toBeInTheDocument();
    expect(getByText('lookup2')).toBeInTheDocument();
  });

  it('calls omitLookup when the omit button is clicked', () => {
    const { getAllByTestId } = render(
      <TestProviders>
        <MissingLookupsList
          missingLookups={['lookup1', 'lookup2']}
          uploadedLookups={{}}
          omitLookup={omitLookup}
          onCopied={onCopied}
        />
      </TestProviders>
    );
    fireEvent.click(getAllByTestId('lookupNameClear')[0]);
    expect(omitLookup).toHaveBeenCalledWith('lookup1');
  });

  it('renders disabled omit lookup button', () => {
    const { getAllByTestId } = render(
      <TestProviders>
        <MissingLookupsList
          missingLookups={['lookup1', 'lookup2']}
          uploadedLookups={{ lookup1: '' }}
          omitLookup={omitLookup}
          onCopied={onCopied}
        />
      </TestProviders>
    );
    expect(getAllByTestId('lookupNameClear')[0]).toBeDisabled();
  });
});
