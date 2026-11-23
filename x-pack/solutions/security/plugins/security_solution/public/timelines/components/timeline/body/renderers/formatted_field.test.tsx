/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { get } from 'lodash/fp';
import React from 'react';

import { mockTimelineData, TestProviders } from '../../../../../common/mock';
import { getEmptyValue } from '../../../../../common/components/empty_value';

import { FormattedFieldValue } from './formatted_field';
import { HOST_NAME_FIELD_NAME } from './constants';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/components/link_to');

const hoverTooltipAnchor = async (container: HTMLElement) => {
  const anchor = container.querySelector('.euiToolTipAnchor');
  expect(anchor).not.toBeNull();
  await userEvent.hover(anchor as Element);
};

describe('Events', () => {
  test('renders a formatted date value', () => {
    const { container } = render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName="timestamp"
          fieldType="date"
          value={get('timestamp', mockTimelineData[0].ecs)}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('Nov 5, 2018 @ 19:03:25.937');
  });

  test('it renders a localized date tooltip for a field type of date that has a valid timestamp', async () => {
    const { container } = render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName="timestamp"
          fieldType="date"
          value={get('timestamp', mockTimelineData[0].ecs)}
        />
      </TestProviders>
    );

    await hoverTooltipAnchor(container);

    expect(await screen.findByTestId('dates-container')).toBeInTheDocument();
  });

  test('it does NOT render a localized date tooltip when field type is NOT date, even if it contains valid timestamp', async () => {
    const { container } = render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName="timestamp"
          fieldType="text"
          value={get('timestamp', mockTimelineData[0].ecs)}
        />
      </TestProviders>
    );

    await hoverTooltipAnchor(container);

    // wait for the hover delay to elapse (the generic message tooltip opens) before checking absence
    await screen.findByRole('tooltip');
    expect(screen.queryByTestId('dates-container')).not.toBeInTheDocument();
  });

  test('it does NOT render a localized date tooltip when field type is date, but it does NOT contains a valid timestamp', async () => {
    const hasBadDate = {
      ...mockTimelineData[0].ecs,
      timestamp: 'not a good first date',
    };

    const { container } = render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName="timestamp"
          fieldType="date"
          value={get('timestamp', hasBadDate)}
        />
      </TestProviders>
    );

    // no tooltip wrapper at all is rendered for an unparsable date
    expect(container.querySelector('.euiToolTipAnchor')).toBeNull();
  });

  test('it renders the value for a non-date field when the field is populated', () => {
    const { container } = render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName="event.module"
          fieldType="text"
          value={get('event.module[0]', mockTimelineData[0].ecs)}
        />
      </TestProviders>
    );

    expect(container.textContent).toEqual('nginx');
  });

  test('it renders placeholder text for a non-date field when the field is NOT populated', () => {
    const { container } = render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName="fake.field"
          fieldType="text"
          value={get('fake.field', mockTimelineData[0].ecs)}
        />
      </TestProviders>
    );

    expect(container.textContent).toEqual(getEmptyValue());
  });

  test('it renders tooltip for truncatable message when it exists', async () => {
    render(
      <TestProviders>
        <FormattedFieldValue
          contextId="test"
          eventId={mockTimelineData[0].ecs._id}
          fieldName="message"
          fieldType="text"
          truncate
          value={'some message'}
        />
      </TestProviders>
    );

    await userEvent.hover(screen.getByTestId('formatted-field-message'));

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  test('it does NOT render a tooltip for truncatable message when it is null', () => {
    render(
      <TestProviders>
        <FormattedFieldValue
          contextId="test"
          eventId={mockTimelineData[0].ecs._id}
          fieldName="message"
          fieldType="text"
          truncate
          value={null}
        />
      </TestProviders>
    );
    expect(screen.queryByTestId('truncatable-message')).not.toBeInTheDocument();
  });

  test('it does NOT render a tooltip for truncatable message when it is undefined', () => {
    render(
      <TestProviders>
        <FormattedFieldValue
          contextId="test"
          eventId={mockTimelineData[0].ecs._id}
          fieldName="message"
          fieldType="text"
          truncate
          value={undefined}
        />
      </TestProviders>
    );
    expect(screen.queryByTestId('truncatable-message')).not.toBeInTheDocument();
  });

  test('it does NOT render a tooltip for truncatable message when it is an empty string', () => {
    render(
      <TestProviders>
        <FormattedFieldValue
          contextId="test"
          eventId={mockTimelineData[0].ecs._id}
          fieldName="message"
          fieldType="text"
          truncate
          value={''}
        />
      </TestProviders>
    );
    expect(screen.queryByTestId('truncatable-message')).not.toBeInTheDocument();
  });

  test('it renders a message text string', () => {
    const { container } = render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName="message"
          fieldType="text"
          value={'some message'}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('some message');
  });

  test('it renders truncatable message text when fieldName is message with truncate prop', () => {
    render(
      <TestProviders>
        <FormattedFieldValue
          contextId="test"
          eventId={mockTimelineData[0].ecs._id}
          fieldName="message"
          fieldType="text"
          truncate
          value={'some message'}
        />
      </TestProviders>
    );
    expect(screen.getByTestId('truncatable-message')).toBeInTheDocument();
  });

  test('it does NOT render the truncatable message style when truncate is false', () => {
    render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName="NOT-message"
          fieldType="text"
          truncate={false}
          value={'a NON-message value'}
        />
      </TestProviders>
    );
    expect(screen.queryByTestId('truncatable-message')).not.toBeInTheDocument();
  });

  test('it renders a button to open the hosts details panel when fieldName is host.name, and a hostname is provided', () => {
    render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName={HOST_NAME_FIELD_NAME}
          fieldType="text"
          value={'some-hostname'}
        />
      </TestProviders>
    );
    expect(screen.getByTestId('host-details-button')).toBeInTheDocument();
  });

  test('it does NOT render a button to open the hosts details panel when fieldName is host.name, but a hostname is NOT provided', () => {
    render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName={HOST_NAME_FIELD_NAME}
          fieldType="text"
          value={undefined}
        />
      </TestProviders>
    );
    expect(screen.queryByTestId('host-details-button')).not.toBeInTheDocument();
  });

  test('it renders placeholder text when fieldName is host.name, but a hostname is NOT provided', () => {
    const { container } = render(
      <TestProviders>
        <FormattedFieldValue
          eventId={mockTimelineData[0].ecs._id}
          contextId="test"
          fieldName={HOST_NAME_FIELD_NAME}
          fieldType="text"
          value={undefined}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual(getEmptyValue());
  });
});
