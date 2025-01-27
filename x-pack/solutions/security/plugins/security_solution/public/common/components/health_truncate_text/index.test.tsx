/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { HealthTruncateText } from '.';

describe('Component HealthTruncateText', () => {
  it('should render component without errors', () => {
    render(<HealthTruncateText dataTestSubj="testItem">{'Test'}</HealthTruncateText>);

    expect(screen.getByTestId('testItem')).toHaveTextContent('Test');
  });
});
