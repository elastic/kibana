/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  GROUPED_ITEM_ACTOR_TEST_ID,
  GROUPED_ITEM_TARGET_OVERFLOW_TEST_ID,
  GROUPED_ITEM_TARGET_TEST_ID,
} from '../../../test_ids';
import { ActorsRow } from './actors_row';

describe('<ActorsRow />', () => {
  it('renders the actor and a single target without an overflow badge', () => {
    const { getByTestId, queryByTestId } = render(
      <ActorsRow actor={{ id: 'user:a@x.com@gcp' }} target={{ ids: ['host:srv'] }} />
    );

    expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toBe('user:a@x.com@gcp');
    expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('host:srv');
    expect(queryByTestId(GROUPED_ITEM_TARGET_OVERFLOW_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders a dash for a missing actor', () => {
    const { getByTestId } = render(<ActorsRow target={{ ids: ['host:srv'] }} />);

    expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toBe('-');
    expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('host:srv');
  });

  it('renders a dash when there are no targets', () => {
    const { getByTestId, queryByTestId } = render(<ActorsRow actor={{ id: 'host:srv' }} />);

    expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toBe('host:srv');
    expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('-');
    expect(queryByTestId(GROUPED_ITEM_TARGET_OVERFLOW_TEST_ID)).not.toBeInTheDocument();
  });

  it('shows the full actor id in a tooltip', async () => {
    const { getByTestId } = render(
      <ActorsRow actor={{ id: 'user:alice@acme.com@aws' }} target={{ ids: ['host:srv'] }} />
    );

    await userEvent.hover(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('user:alice@acme.com@aws');
  });

  it('shows the full first target in a tooltip', async () => {
    const { getByTestId } = render(
      <ActorsRow
        actor={{ id: 'host:srv' }}
        target={{ ids: ['arn:aws:iam::123456789012:role/DataPipelineRole', 't2'] }}
      />
    );

    await userEvent.hover(getByTestId(GROUPED_ITEM_TARGET_TEST_ID));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'arn:aws:iam::123456789012:role/DataPipelineRole'
    );
  });

  it('shows the first target and a +N badge whose tooltip lists the others', async () => {
    const { getByTestId } = render(
      <ActorsRow actor={{ id: 'host:srv' }} target={{ ids: ['t1', 't2', 't3'] }} />
    );

    expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('t1');
    expect(getByTestId(GROUPED_ITEM_TARGET_OVERFLOW_TEST_ID).textContent).toBe('+2');

    await userEvent.hover(getByTestId(GROUPED_ITEM_TARGET_OVERFLOW_TEST_ID));

    expect(await screen.findByText('t2, t3')).toBeInTheDocument();
    expect(screen.getByText('Additional targets')).toBeInTheDocument();
  });
});
