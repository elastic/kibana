/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { ONE_MILLISECOND_AS_NANOSECONDS } from '../formatted_duration/helpers';

import { Duration } from '.';

jest.mock('../../../common/lib/kibana');

describe('Duration', () => {
  test('it renders the expected formatted duration', () => {
    render(
      <TestProviders>
        <Duration fieldName="event.duration" value={`${ONE_MILLISECOND_AS_NANOSECONDS}`} />
      </TestProviders>
    );
    expect(screen.getByText('1ms')).toBeInTheDocument();
  });
});
