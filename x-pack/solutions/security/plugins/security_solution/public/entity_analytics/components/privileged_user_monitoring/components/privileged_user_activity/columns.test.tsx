/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  buildGrantedRightsColumns,
  buildAccountSwitchesColumns,
  buildAuthenticationsColumns,
} from './columns';
import { TestProviders } from '../../../../../common/mock';
import type { TableItemType } from './types';
import { getEmptyValue } from '../../../../../common/components/empty_value';

const mockOpenRightPanel = jest.fn();

const baseRecord: TableItemType = {
  _id: 'test-id',
  _index: 'test-index',
  '@timestamp': '2024-01-01T00:00:00.000Z',
  privileged_user: 'alice',
  target_user: 'bob',
  ip: '1.2.3.4',
  right: 'read',
  group_name: 'admin',
  command_process: 'bash',
  source: 'console',
  url: 'login',
  method: 'password',
  result: 'success',
  destination: 'server1',
};

describe('columns', () => {
  describe('buildGrantedRightsColumns', () => {
    const columns = buildGrantedRightsColumns(mockOpenRightPanel);

    it('renders actions column and calls openRightPanel on click', () => {
      const col = columns[0] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.(baseRecord, baseRecord)}</>, { wrapper: TestProviders });
      const btn = screen.getByRole('button');
      fireEvent.click(btn);
      expect(mockOpenRightPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          params: expect.objectContaining({ id: 'test-id', indexName: 'test-index' }),
        })
      );
    });

    it('renders timestamp column', () => {
      const col = columns[1] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.(baseRecord['@timestamp'], baseRecord)}</>, {
        wrapper: TestProviders,
      });
      expect(screen.getByText('Jan 1, 2024 @ 00:00:00.000')).toBeInTheDocument();
    });

    it('renders privileged user column', () => {
      const col = columns[2] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.(baseRecord.privileged_user, baseRecord)}</>, {
        wrapper: TestProviders,
      });
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    it('renders target user column', () => {
      const col = columns[3] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.(baseRecord.target_user, baseRecord)}</>, { wrapper: TestProviders });
      expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('renders group_name column', () => {
      const col = columns[4] as EuiTableFieldDataColumnType<TableItemType>;
      render(
        <>{col.render ? col.render(baseRecord.group_name, baseRecord) : baseRecord.group_name}</>,
        { wrapper: TestProviders }
      );
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('renders ip column', () => {
      const col = columns[5] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.('1.2.3.4', baseRecord)}</>, { wrapper: TestProviders });
      expect(screen.getByText('1.2.3.4')).toBeInTheDocument();
    });
  });

  describe('buildAccountSwitchesColumns', () => {
    const columns = buildAccountSwitchesColumns(mockOpenRightPanel);

    it('renders privileged_user column with different field', () => {
      const col = columns[2] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.('alice', baseRecord)}</>, { wrapper: TestProviders });
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    it('renders target_user column with custom name', () => {
      const col = columns[3] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.('bob', baseRecord)}</>, { wrapper: TestProviders });
      expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('renders group_name column', () => {
      const col = columns[4] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render ? col.render('admin', baseRecord) : 'admin'}</>, {
        wrapper: TestProviders,
      });
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('renders command_process column', () => {
      const col = columns[5] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render ? col.render('bash', baseRecord) : 'bash'}</>, {
        wrapper: TestProviders,
      });
      expect(screen.getByText('bash')).toBeInTheDocument();
    });
  });

  describe('buildAuthenticationsColumns', () => {
    const columns = buildAuthenticationsColumns(mockOpenRightPanel);

    it('renders privileged_user column', () => {
      const col = columns[2] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.('alice', baseRecord)}</>, { wrapper: TestProviders });
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    it('renders source column with capitalize', () => {
      const col = columns[3] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.('console', baseRecord)}</>, { wrapper: TestProviders });
      expect(screen.getByText('Console')).toBeInTheDocument();
    });

    it('renders type column', () => {
      const col = columns[4] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.('Direct', baseRecord)}</>, {
        wrapper: TestProviders,
      });
      expect(screen.getByText('Direct')).toBeInTheDocument();
    });

    it('renders result column with badge', () => {
      const col = columns[5] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.('success', baseRecord)}</>, { wrapper: TestProviders });
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('renders result column with empty value', () => {
      const col = columns[5] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.('', baseRecord)}</>, { wrapper: TestProviders });
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    it('renders ip column', () => {
      const col = columns[6] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render?.('1.2.3.4', baseRecord)}</>, { wrapper: TestProviders });
      expect(screen.getByText('1.2.3.4')).toBeInTheDocument();
    });

    it('renders destination column', () => {
      const col = columns[7] as EuiTableFieldDataColumnType<TableItemType>;
      render(<>{col.render ? col.render('server1', baseRecord) : 'server1'}</>, {
        wrapper: TestProviders,
      });
      expect(screen.getByText('server1')).toBeInTheDocument();
    });
  });
});
