/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, waitFor } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock/test_providers';

import { DataProviders } from '.';
import { TimelineId } from '../../../../../common/types/timeline';

describe('DataProviders', () => {
  describe('rendering', () => {
    test('renders correctly against snapshot', async () => {
      const { container } = render(
        <TestProviders>
          <DataProviders timelineId="foo" />
        </TestProviders>
      );

      await waitFor(() => {
        expect(
          container.querySelector('.drop-target-data-providers-container')
        ).toBeInTheDocument();
        expect(screen.getByTestId('dataProviders')).toBeInTheDocument();
      });
    });

    test('it should render a placeholder when there are zero data providers', async () => {
      const dropMessage = ['Drop', 'query', 'build', 'here'];

      const { container } = render(
        <TestProviders>
          <DataProviders timelineId="foo" />
        </TestProviders>
      );

      await waitFor(() => {
        dropMessage.forEach((word) => expect(container.textContent).toContain(word));
      });
    });

    test('it renders the data providers', async () => {
      render(
        <TestProviders>
          <DataProviders timelineId="foo" />
        </TestProviders>
      );

      expect((await screen.findByTestId('empty')).textContent).toEqual(
        'Drop anythinghighlightedhere to build anORquery+ Add field'
      );
    });

    describe('resizable drop target', () => {
      test('it may be resized vertically via a resize handle', async () => {
        render(
          <TestProviders>
            <DataProviders timelineId={TimelineId.test} />
          </TestProviders>
        );

        expect(await screen.findByTestId('dataProviders')).toHaveStyleRule('resize', 'vertical');
      });

      test('it never grows taller than one third (33%) of the view height', async () => {
        render(
          <TestProviders>
            <DataProviders timelineId={TimelineId.test} />
          </TestProviders>
        );

        expect(await screen.findByTestId('dataProviders')).toHaveStyleRule('max-height', '33vh');
      });

      test('it automatically displays scroll bars when the width or height of the data providers exceeds the drop target', async () => {
        render(
          <TestProviders>
            <DataProviders timelineId={TimelineId.test} />
          </TestProviders>
        );

        expect(await screen.findByTestId('dataProviders')).toHaveStyleRule('overflow', 'auto');
      });
    });
  });
});
