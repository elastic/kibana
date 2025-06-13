/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SEVERITY_VALUE_TEST_ID } from './test_ids';
import { DocumentSeverity } from './severity';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import { TestProviders } from '../../../../common/mock';

describe('<DocumentSeverity />', () => {
  it('should render severity information', () => {
    const getFieldsData = jest.fn().mockImplementation(mockGetFieldsData);

    const { getByTestId } = render(
      <TestProviders>
        <DocumentSeverity getFieldsData={getFieldsData} />
      </TestProviders>
    );

    const severity = getByTestId(SEVERITY_VALUE_TEST_ID);
    expect(severity).toBeInTheDocument();
    expect(severity).toHaveTextContent('Low');
  });

  it('should render empty component if missing getFieldsData value', () => {
    const getFieldsData = jest.fn();

    const { container } = render(
      <TestProviders>
        <DocumentSeverity getFieldsData={getFieldsData} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if getFieldsData is invalid array', () => {
    const getFieldsData = jest.fn().mockImplementation(() => ['abc']);

    const { container } = render(
      <TestProviders>
        <DocumentSeverity getFieldsData={getFieldsData} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if getFieldsData is invalid string', () => {
    const getFieldsData = jest.fn().mockImplementation(() => 'abc');

    const { container } = render(
      <TestProviders>
        <DocumentSeverity getFieldsData={getFieldsData} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
