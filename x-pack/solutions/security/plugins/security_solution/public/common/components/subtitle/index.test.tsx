/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../mock';
import { Subtitle } from '.';

describe('Subtitle', () => {
  test('it renders', () => {
    render(
      <TestProviders>
        <Subtitle items="Test subtitle" />
      </TestProviders>
    );

    const container = screen.getByTestId('subtitle');

    expect(container).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  test('it uses custom data-test-subj for wrapper when provided', () => {
    render(
      <TestProviders>
        <Subtitle items="Test subtitle" data-test-subj="custom-subtitle-test" />
      </TestProviders>
    );

    expect(screen.getByTestId('custom-subtitle-test')).toBeInTheDocument();
    expect(screen.queryByTestId('subtitle')).not.toBeInTheDocument();
  });

  test('it renders one subtitle string item', () => {
    const { container } = render(
      <TestProviders>
        <Subtitle items="Test subtitle" />
      </TestProviders>
    );

    const textItem = container.querySelectorAll('.siemSubtitle__item--text');
    expect(textItem.length).toEqual(1);
    expect(textItem[0]).toHaveTextContent('Test subtitle');
  });

  test('it renders multiple subtitle string items', () => {
    const { container } = render(
      <TestProviders>
        <Subtitle items={['Test subtitle 1', 'Test subtitle 2']} />
      </TestProviders>
    );

    const textItems = container.querySelectorAll('.siemSubtitle__item--text');
    expect(textItems.length).toEqual(2);
    expect(textItems[0]).toHaveTextContent('Test subtitle 1');
    expect(textItems[1]).toHaveTextContent('Test subtitle 2');
  });

  test('it renders one subtitle React.ReactNode item', () => {
    const { container } = render(
      <TestProviders>
        <Subtitle items={<span>{'Test subtitle'}</span>} />
      </TestProviders>
    );

    const nodeItems = container.querySelectorAll('.siemSubtitle__item--node');
    expect(nodeItems.length).toEqual(1);
    expect(nodeItems[0]).toHaveTextContent('Test subtitle');
  });

  test('it renders multiple subtitle React.ReactNode items', () => {
    const { container } = render(
      <TestProviders>
        <Subtitle
          items={[
            <span key="1">{'Test subtitle 1'}</span>,
            <span key="2">{'Test subtitle 2'}</span>,
          ]}
        />
      </TestProviders>
    );

    const nodeItems = container.querySelectorAll('.siemSubtitle__item--node');
    expect(nodeItems.length).toEqual(2);
    expect(nodeItems[0]).toHaveTextContent('Test subtitle 1');
    expect(nodeItems[1]).toHaveTextContent('Test subtitle 2');
  });

  test('it renders multiple subtitle items of mixed type', () => {
    const { container } = render(
      <TestProviders>
        <Subtitle items={['Test subtitle 1', <span key="2">{'Test subtitle 2'}</span>]} />
      </TestProviders>
    );

    const items = container.querySelectorAll('.siemSubtitle__item');
    expect(items.length).toEqual(2);
    expect(items[0]).toHaveTextContent('Test subtitle 1');
    expect(items[1]).toHaveTextContent('Test subtitle 2');
  });
});
