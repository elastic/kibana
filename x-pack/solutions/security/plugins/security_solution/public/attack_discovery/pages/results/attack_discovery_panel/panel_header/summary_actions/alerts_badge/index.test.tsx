/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';

import { AlertsBadge } from '.';

describe('AlertsBadge', () => {
  it('render the expected alerts count', () => {
    const alertsCount = 5;

    const { getByTestId } = render(<AlertsBadge alertsCount={alertsCount} />);
    const badgeElement = getByTestId('alertsBadge');

    expect(badgeElement.textContent).toBe(`${alertsCount}`);
  });
});
