/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../mock';
import { MissingPrivilegesDescription } from './missing_privileges_description';

const privileges = ['privilege1', 'privilege2'];

describe('MissingPrivilegesDescription', () => {
  it('should show description', () => {
    const { getByText } = render(
      <TestProviders>
        <MissingPrivilegesDescription privileges={privileges} />
      </TestProviders>
    );

    expect(
      getByText('The minimum Kibana privileges required to use this feature are:')
    ).toBeInTheDocument();
    expect(getByText('Contact your administrator for assistance.')).toBeInTheDocument();
    expect(getByText('privilege1')).toBeInTheDocument();
    expect(getByText('privilege2')).toBeInTheDocument();
  });
});
