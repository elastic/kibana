/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BasicMissingPrivilegesCallOut } from './basic_missing_privileges_callout';

describe('BasicMissingPrivilegesCallOut', () => {
  it('should show callout with children', () => {
    const { getByText } = render(
      <BasicMissingPrivilegesCallOut>
        <div>{'test'}</div>
      </BasicMissingPrivilegesCallOut>
    );

    expect(getByText('Missing privileges')).toBeInTheDocument();
    expect(getByText('test')).toBeInTheDocument();
  });
});
