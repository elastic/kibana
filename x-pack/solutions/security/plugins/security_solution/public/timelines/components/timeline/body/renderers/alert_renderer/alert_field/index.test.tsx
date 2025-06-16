/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../../common/mock';
import { AlertField } from '.';
import { TimelineId } from '../../../../../../../../common/types/timeline';

const contextId = 'test';
const eventId = 'abcd';
const field = 'destination.ip';
const timelineId = TimelineId.test;
const prefix = 'this is the beginning';
const suffix = 'the end';

describe('AlertField', () => {
  const singleValue = ['127.0.0.1'];
  const multipleValues = ['127.0.0.1', '192.168.1.1', '10.0.0.1'];

  test('it does NOT render the alert field when `values` is undefined', () => {
    render(
      <TestProviders>
        <AlertField
          contextId={contextId}
          eventId={eventId}
          field={field}
          scopeId={timelineId}
          values={undefined} // <-- undefined
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('alertField')).not.toBeInTheDocument();
  });

  test('it does NOT render a prefix by default', () => {
    render(
      <TestProviders>
        <AlertField
          contextId={contextId}
          eventId={eventId}
          field={field}
          scopeId={timelineId}
          values={multipleValues}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('prefix')).not.toBeInTheDocument();
  });

  test('it renders the expected `prefix`', () => {
    render(
      <TestProviders>
        <AlertField
          contextId={contextId}
          eventId={eventId}
          field={field}
          prefix={prefix}
          scopeId={timelineId}
          values={multipleValues}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('prefix')).toHaveTextContent('this is the beginning');
  });

  test('it renders the expected value when a single value is provided', () => {
    render(
      <TestProviders>
        <AlertField
          contextId={contextId}
          eventId={eventId}
          field={field}
          scopeId={timelineId}
          values={singleValue} // <-- a single value
        />
      </TestProviders>
    );

    expect(screen.getByTestId('alertField')).toHaveTextContent('127.0.0.1');
  });

  test('it renders the expected comma-separated values when multiple values are provided', () => {
    render(
      <TestProviders>
        <AlertField
          contextId={contextId}
          eventId={eventId}
          field={field}
          scopeId={timelineId}
          values={multipleValues} // <-- multiple values
        />
      </TestProviders>
    );

    expect(screen.getByTestId('alertField')).toHaveTextContent('127.0.0.1, 192.168.1.1, 10.0.0.1');
  });

  test('it does NOT render a suffix by default', () => {
    render(
      <TestProviders>
        <AlertField
          contextId={contextId}
          eventId={eventId}
          field={field}
          scopeId={timelineId}
          values={multipleValues}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('suffix')).not.toBeInTheDocument();
  });

  test('it renders the expected `suffix`', () => {
    render(
      <TestProviders>
        <AlertField
          contextId={contextId}
          eventId={eventId}
          field={field}
          suffix={suffix}
          scopeId={timelineId}
          values={multipleValues}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('suffix')).toHaveTextContent('the end');
  });

  test('it renders the expected prefix, comma-separated values, and finally suffix, when all of the above are provided', () => {
    render(
      <TestProviders>
        <AlertField
          contextId={contextId}
          eventId={eventId}
          field={field}
          prefix={prefix}
          suffix={suffix}
          scopeId={timelineId}
          values={multipleValues} // <-- multiple values
        />
      </TestProviders>
    );

    expect(screen.getByTestId('alertField')).toHaveTextContent(
      'this is the beginning127.0.0.1, 192.168.1.1, 10.0.0.1the end'
    );
  });
});
