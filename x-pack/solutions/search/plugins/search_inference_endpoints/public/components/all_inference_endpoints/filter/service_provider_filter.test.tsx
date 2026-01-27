/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { ServiceProviderFilter } from './service_provider_filter';

describe('ServiceProviderFilter', () => {
  it('should render the filter with known and unknown providers', () => {
    const { getByTestId } = render(
      <ServiceProviderFilter
        optionKeys={[]}
        onChange={jest.fn}
        uniqueProviders={new Set(['elasticsearch', 'unknownProvider'] as ServiceProviderKeys[])}
      />
    );
    expect(getByTestId('service-field-endpoints')).toBeInTheDocument();
  });
});
