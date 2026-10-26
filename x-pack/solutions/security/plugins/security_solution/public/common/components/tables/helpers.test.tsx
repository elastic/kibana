/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import {
  getRowItemsWithActions,
  OverflowFieldComponent,
  RowItemOverflowComponent,
} from './helpers';
import { TestProviders } from '../../mock';
import { getEmptyValue } from '../empty_value';

jest.mock('../../lib/kibana');

describe('Table Helpers', () => {
  const items = ['item1', 'item2', 'item3'];

  describe('#getRowItemsWithActions', () => {
    test('it returns empty value when values is undefined', () => {
      const rowItem = getRowItemsWithActions({
        values: undefined,
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
      });

      const { container } = render(<TestProviders>{rowItem}</TestProviders>);

      expect(container.textContent).toBe(getEmptyValue());
    });

    test('it returns empty string value when values is empty', () => {
      const rowItem = getRowItemsWithActions({
        values: [''],
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
      });
      const { container } = render(<TestProviders>{rowItem}</TestProviders>);

      expect(container.textContent).toContain('(Empty string)');
    });

    test('it returns empty value when rowItem is null', () => {
      const rowItem = getRowItemsWithActions({
        values: null,
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 0,
      });
      const { container } = render(<TestProviders>{rowItem}</TestProviders>);
      expect(container.textContent).toBe(getEmptyValue());
    });

    test('it uses custom renderer', () => {
      const renderer = (item: string) => <>{`Hi ${item} renderer`}</>;
      const rowItem = getRowItemsWithActions({
        values: ['item1'],
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
        render: renderer,
      });
      const { container } = render(<TestProviders>{rowItem}</TestProviders>);

      expect(container.textContent).toContain('Hi item1 renderer');
    });

    test('it returns no items when provided an empty array', () => {
      const rowItems = getRowItemsWithActions({
        values: [],
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
      });
      const { container } = render(<TestProviders>{rowItems}</TestProviders>);
      expect(container.textContent).toBe(getEmptyValue());
    });

    test('it returns 2 items then overflows when displayCount is 2', () => {
      const rowItems = getRowItemsWithActions({
        values: items,
        fieldName: 'user.name',
        idPrefix: 'idPrefix',
        displayCount: 2,
      });
      const { queryAllByTestId, queryByTestId } = render(<TestProviders>{rowItems}</TestProviders>);
      expect(queryAllByTestId('cellActions-renderContent-user.name').length).toBe(2);
      expect(queryByTestId('overflow-button')).toBeInTheDocument();
    });
  });

  describe('#RowItemOverflow', () => {
    test('it returns correctly against snapshot', () => {
      const { container } = render(
        <TestProviders>
          <RowItemOverflowComponent
            values={items}
            fieldName="attrName"
            idPrefix="idPrefix"
            overflowIndexStart={1}
            maxOverflowItems={1}
          />
        </TestProviders>
      );
      expect(container.children[0]).toMatchSnapshot();
    });

    test('it does not show "more not shown" when maxOverflowItems are not exceeded', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <RowItemOverflowComponent
            values={items}
            fieldName="attrName"
            idPrefix="idPrefix"
            maxOverflowItems={5}
            overflowIndexStart={1}
          />
        </TestProviders>
      );
      expect(queryByTestId('popover-additional-overflow')).not.toBeInTheDocument();
    });

    test('it shows correct number of overflow items when maxOverflowItems are not exceeded', async () => {
      const { getByTestId } = render(
        <TestProviders>
          <RowItemOverflowComponent
            values={items}
            fieldName="attrName"
            idPrefix="idPrefix"
            maxOverflowItems={5}
            overflowIndexStart={1}
          />
        </TestProviders>
      );

      fireEvent.click(getByTestId('overflow-button'));

      const overflowItems = await screen.findByTestId('overflow-items');
      expect(overflowItems?.children.length).toEqual(2);
    });

    test('it shows "more not shown" when maxOverflowItems are exceeded', async () => {
      render(
        <TestProviders>
          <RowItemOverflowComponent
            values={items}
            fieldName="attrName"
            idPrefix="idPrefix"
            maxOverflowItems={1}
            overflowIndexStart={1}
          />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('overflow-button'));

      expect(await screen.findByTestId('popover-additional-overflow')).toBeInTheDocument();
    });

    test('it shows correct number of overflow items when maxOverflowItems are exceeded', async () => {
      render(
        <TestProviders>
          <RowItemOverflowComponent
            values={items}
            fieldName="attrName"
            idPrefix="idPrefix"
            maxOverflowItems={1}
            overflowIndexStart={1}
          />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('overflow-button'));

      const overflowItems = await screen.findByTestId('overflow-items');
      expect(overflowItems?.children.length).toBe(1);
    });
  });

  describe('OverflowField', () => {
    test('it renders', () => {
      const overflowString = 'This string is exactly fifty-one chars in length!!!';
      const { container } = render(
        <OverflowFieldComponent value={overflowString} showToolTip={false} />
      );
      expect(container.children[0]).toMatchSnapshot();
    });

    test('it does not truncates as per custom overflowLength value', () => {
      const overflowString = 'This string is short';
      const { container } = render(
        <OverflowFieldComponent value={overflowString} overflowLength={20} />
      );
      expect(container.textContent).toBe('This string is short');
    });

    test('it truncates as per custom overflowLength value', () => {
      const overflowString = 'This string is exactly fifty-one chars in length!!!';
      const { container } = render(
        <OverflowFieldComponent value={overflowString} overflowLength={20} />
      );
      expect(container.textContent).toBe('This string is exact');
    });
  });
});
