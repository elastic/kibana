/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, render } from '@testing-library/react';
import { getOr } from 'lodash/fp';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { TestProviders } from '../../../../common/mock';
import { hostsModel } from '../../store';
import { getEmptyValue } from '../../../../common/components/empty_value';

import { UncommonProcessTable } from '.';
import { mockData } from './mock';

jest.mock('../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../common/components/link_to');

describe('Uncommon Process Table Component', () => {
  const loadPage = jest.fn();

  const defaultProps = {
    data: mockData.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockData.pageInfo),
    id: 'uncommonProcess',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockData.pageInfo),
    totalCount: mockData.totalCount,
    type: hostsModel.HostsType.page,
  };

  describe('rendering', () => {
    test('it renders the default Uncommon process table', () => {
      render(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('table-uncommonProcesses-loading-false')).toMatchSnapshot();
    });

    test('it has a double dash (empty value) without any hosts at all', () => {
      const { container } = render(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelector('tr.euiTableRow:first-child td.euiTableRowCell:nth-child(4)')
          ?.textContent
      ).toBe(`${getEmptyValue()}`);
    });

    test('it has a single host without any extra comma when the number of hosts is exactly 1', () => {
      const { container } = render(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(
        container.querySelector('tr.euiTableRow:nth-child(2) td.euiTableRowCell:nth-child(4)')
          ?.textContent
      ).toBe('hello-world ');
    });

    test('it has a single link when the number of hosts is exactly 1', () => {
      const { container } = render(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(
        container.querySelectorAll('tr.euiTableRow:nth-child(2) td.euiTableRowCell:nth-child(4) a')
      ).toHaveLength(1);
    });

    test('it has a comma separated list of hosts when the number of hosts is greater than 1', () => {
      const { container } = render(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(
        container.querySelector('tr.euiTableRow:nth-child(3) td.euiTableRowCell:nth-child(4)')
          ?.textContent
      ).toBe('hello-worldhello-world-2 ');
    });

    test('it has 2 links when the number of hosts is equal to 2', () => {
      const { container } = render(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(
        container.querySelectorAll('tr.euiTableRow:nth-child(3) td.euiTableRowCell:nth-child(4) a')
      ).toHaveLength(2);
    });

    test('it is empty when all hosts are invalid because they do not contain an id and a name', () => {
      const { container } = render(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelector('tr.euiTableRow:nth-child(4) td.euiTableRowCell:nth-child(4)')
          ?.textContent
      ).toBe(`${getEmptyValue()}`);
    });

    test('it has no link when all hosts are invalid because they do not contain an id and a name', () => {
      const { container } = render(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelectorAll('tr.euiTableRow:nth-child(4) td.euiTableRowCell:nth-child(4) a')
      ).toHaveLength(0);
    });

    test('it is returns two hosts when others are invalid because they do not contain an id and a name', () => {
      const { container } = render(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelector('tr.euiTableRow:nth-child(5) td.euiTableRowCell:nth-child(4)')
          ?.textContent
      ).toBe('hello-worldhello-world-2 ');
    });
  });
});
