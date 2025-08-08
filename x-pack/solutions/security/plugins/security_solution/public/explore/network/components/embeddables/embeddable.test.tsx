/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, render } from '@testing-library/react';
import React from 'react';

import { Embeddable } from './embeddable';

describe('Embeddable', () => {
  test('it renders', () => {
    render(
      <Embeddable>
        <p>{'Test content'}</p>
      </Embeddable>
    );

    expect(screen.getByTestId('siemEmbeddable')).toMatchSnapshot();
  });
});
