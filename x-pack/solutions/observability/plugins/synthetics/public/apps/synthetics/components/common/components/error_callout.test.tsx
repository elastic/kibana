/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import { ErrorCallout } from './error_callout';
import { IHttpSerializedFetchError } from '../../../state';

describe('ErrorCallout', () => {
  it('renders', () => {
    const error: IHttpSerializedFetchError = {
      name: 'Test Error',
      body: {
        error: 'Test Error',
        message: 'Test Error',
        statusCode: 500,
      },
      requestUrl: 'http://localhost:5601',
    };

    const { getByText } = render(<ErrorCallout {...error} />);

    expect(getByText('Error fetching monitor details'));
    expect(getByText('Unable to fetch monitor details'));
    expect(getByText('Message: Test Error'));
    expect(getByText('Error: Test Error'));
    expect(getByText('Status code: 500'));
  });
});
