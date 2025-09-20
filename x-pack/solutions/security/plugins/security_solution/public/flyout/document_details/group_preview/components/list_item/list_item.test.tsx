/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  GROUPED_LIST_ITEM_TEST_ID,
  GROUPED_LIST_ITEM_TITLE_TEST_ID,
  GROUPED_LIST_ITEM_TIMESTAMP_TEST_ID,
  GROUPED_LIST_ITEM_ACTOR_TEST_ID,
  GROUPED_LIST_ITEM_TARGET_TEST_ID,
  GROUPED_LIST_ITEM_IP_TEST_ID,
  GROUPED_LIST_ITEM_RISK_TEST_ID,
  GROUPED_LIST_ITEM_SKELETON_TEST_ID,
} from '../../test_ids';
import { GroupedListItem } from './list_item';

describe('<GroupedListItem />', () => {
  it('renders loading skeleton', () => {
    const { getByTestId } = render(
      <GroupedListItem
        isLoading
        item={{ type: 'event', id: 'event-id', action: 'login', timestamp: Date.now() }}
      />
    );
    expect(getByTestId(GROUPED_LIST_ITEM_SKELETON_TEST_ID)).toBeInTheDocument();
  });

  it('renders event item with actor and target', () => {
    const { getByTestId, queryByTestId } = render(
      <GroupedListItem
        item={{
          type: 'event',
          id: 'event-id',
          action: 'process_start',
          timestamp: 1717459200000,
          actor: { label: 'user1', id: 'a1' },
          target: { label: 'proc.exe', id: 'p1' },
          ip: '1.2.3.4',
        }}
      />
    );
    expect(getByTestId(GROUPED_LIST_ITEM_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(GROUPED_LIST_ITEM_TITLE_TEST_ID).textContent).toBe('process_start');
    expect(getByTestId(GROUPED_LIST_ITEM_ACTOR_TEST_ID).textContent).toContain('user1');
    expect(getByTestId(GROUPED_LIST_ITEM_TARGET_TEST_ID).textContent).toContain('proc.exe');
    expect(getByTestId(GROUPED_LIST_ITEM_IP_TEST_ID).textContent).toContain('1.2.3.4');
    expect(queryByTestId(GROUPED_LIST_ITEM_RISK_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders alert item with icon and no target if missing', () => {
    const { getByTestId, queryByTestId } = render(
      <GroupedListItem
        item={{
          type: 'alert',
          id: 'alert-id',
          action: 'alert_action',
          timestamp: 1717459200000,
          actor: { id: 'host-1', label: 'host' },
          ip: '9.9.9.9',
        }}
      />
    );
    expect(getByTestId(GROUPED_LIST_ITEM_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(GROUPED_LIST_ITEM_TITLE_TEST_ID).textContent).toBe('alert_action');
    expect(getByTestId(GROUPED_LIST_ITEM_ACTOR_TEST_ID).textContent).toContain('host');
    expect(queryByTestId(GROUPED_LIST_ITEM_TARGET_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders entity with risk and ip', () => {
    const { getByTestId } = render(
      <GroupedListItem
        item={{
          type: 'entity',
          label: 'entity-1',
          id: 'e1',
          risk: 55,
          ip: '5.5.5.5',
          timestamp: 1717459200000,
          icon: 'node',
        }}
      />
    );
    expect(getByTestId(GROUPED_LIST_ITEM_TITLE_TEST_ID).textContent).toBe('entity-1');
    expect(getByTestId(GROUPED_LIST_ITEM_RISK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(GROUPED_LIST_ITEM_IP_TEST_ID).textContent).toContain('5.5.5.5');
  });

  it('falls back to entity id when label missing', () => {
    const { getByTestId } = render(<GroupedListItem item={{ type: 'entity', id: 'e2' }} />);
    expect(getByTestId(GROUPED_LIST_ITEM_TITLE_TEST_ID).textContent).toBe('e2');
  });

  it('falls back to dash when event action missing', () => {
    const { getByTestId } = render(
      <GroupedListItem item={{ type: 'event', id: 'event-id', timestamp: 1 }} />
    );
    expect(getByTestId(GROUPED_LIST_ITEM_TITLE_TEST_ID).textContent).toBe('-');
  });

  it('renders timestamp when provided', () => {
    const { getByTestId } = render(
      <GroupedListItem
        item={{ type: 'event', id: 'event-id', action: 'a', timestamp: 1717459200000 }}
      />
    );
    expect(getByTestId(GROUPED_LIST_ITEM_TIMESTAMP_TEST_ID)).toBeInTheDocument();
  });
});
