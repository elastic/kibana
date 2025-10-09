/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MissingPrivilegesTooltip } from './missing_privileges_tooltip';

const description = <div>{'description'}</div>;

describe('MissingPrivilegesTooltip', () => {
  it('should show tooltip', () => {
    const { getByTestId, getByText } = render(
      <MissingPrivilegesTooltip description={description}>
        <div>{'children'}</div>
      </MissingPrivilegesTooltip>
    );

    expect(getByTestId('missingPrivilegesTooltipAnchor')).toBeInTheDocument();
    expect(getByText('children')).toBeInTheDocument();
  });
});
