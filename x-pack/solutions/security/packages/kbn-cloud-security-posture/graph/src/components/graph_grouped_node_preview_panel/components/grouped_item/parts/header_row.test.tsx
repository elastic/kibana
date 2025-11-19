/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DOCUMENT_TYPE_ENTITY } from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { groupedItemClick$, __resetGroupedItemClickDedupe } from '../../../events';
import { GROUPED_ITEM_TITLE_TEST_ID } from '../../../test_ids';
import { HeaderRow } from './header_row';

const flushMicrotasks = () => new Promise((r) => setTimeout(r, 0));

describe('<HeaderRow />', () => {
  beforeEach(() => {
    __resetGroupedItemClickDedupe();
  });

  it('emits click event once for a single click', async () => {
    const item = { itemType: DOCUMENT_TYPE_ENTITY, id: 'entity-1', label: 'Entity One' } as const;
    const next = jest.fn();
    const sub = groupedItemClick$.subscribe(next);

    const { getByTestId } = render(<HeaderRow item={item} />);

    fireEvent.click(getByTestId(GROUPED_ITEM_TITLE_TEST_ID));
    await flushMicrotasks();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ id: 'entity-1' });
    sub.unsubscribe();
  });

  it('suppresses rapid duplicate clicks within dedupe window', async () => {
    const item = { itemType: DOCUMENT_TYPE_ENTITY, id: 'entity-dup', label: 'Dup' } as const;
    const next = jest.fn();
    const sub = groupedItemClick$.subscribe(next);

    const { getByTestId } = render(<HeaderRow item={item} />);

    const link = getByTestId(GROUPED_ITEM_TITLE_TEST_ID);
    Array.from({ length: 3 }).forEach(() => fireEvent.click(link));
    await flushMicrotasks();

    expect(next).toHaveBeenCalledTimes(1);
    sub.unsubscribe();
  });
});
