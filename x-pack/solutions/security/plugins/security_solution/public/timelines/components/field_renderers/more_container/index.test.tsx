/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { MoreContainer } from '.';
import { mockGetUrlForApp } from '@kbn/security-solution-navigation/mocks/context';

jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/security-solution-navigation/src/context');
mockGetUrlForApp.mockImplementation(
  (appId: string, options?: { path?: string; deepLinkId?: boolean }) =>
    `${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`
);

const DEFAULT_MORE_MAX_HEIGHT = '100px';

describe('Field Renderers', () => {
  describe('MoreContainer', () => {
    const idPrefix = 'prefix-1';
    const rowItems = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7'];

    test('it should only render the items after overflowIndexStart', () => {
      render(
        <TestProviders>
          <MoreContainer
            idPrefix={idPrefix}
            overflowIndexStart={5}
            values={rowItems}
            fieldName="mock.attr"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('more-container').textContent).toEqual('item6item7');
    });

    test('it should render all the items when overflowIndexStart is zero', () => {
      render(
        <TestProviders>
          <MoreContainer
            idPrefix={idPrefix}
            overflowIndexStart={0}
            values={rowItems}
            fieldName="mock.attr"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('more-container').textContent).toEqual(
        'item1item2item3item4item5item6item7'
      );
    });

    test('it should have the eui-yScroll to enable scrolling when necessary', () => {
      render(
        <TestProviders>
          <MoreContainer
            idPrefix={idPrefix}
            overflowIndexStart={5}
            values={rowItems}
            fieldName="mock.attr"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('more-container')).toHaveClass('eui-yScroll');
    });

    test('it should use the moreMaxHeight prop as the value for the max-height style', () => {
      render(
        <TestProviders>
          <MoreContainer
            idPrefix={idPrefix}
            overflowIndexStart={5}
            moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
            values={rowItems}
            fieldName="mock.attr"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('more-container')).toHaveStyle(
        `max-height: ${DEFAULT_MORE_MAX_HEIGHT}`
      );
    });

    test('it should render with correct attrName prop', () => {
      render(
        <TestProviders>
          <MoreContainer
            idPrefix={idPrefix}
            overflowIndexStart={5}
            values={rowItems}
            fieldName="mock.attr"
          />
        </TestProviders>
      );

      screen
        .getAllByTestId('cellActions-renderContent-mock.attr')
        .forEach((element) => expect(element).toBeInTheDocument());
    });

    test('it should only invoke the optional render function when provided', () => {
      const renderFn = jest.fn();

      render(
        <TestProviders>
          <MoreContainer
            idPrefix={idPrefix}
            overflowIndexStart={5}
            render={renderFn}
            values={rowItems}
            fieldName="mock.attr"
          />
        </TestProviders>
      );

      expect(renderFn).toHaveBeenCalledTimes(2);
    });
  });
});
