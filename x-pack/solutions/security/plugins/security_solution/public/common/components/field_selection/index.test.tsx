/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../mock';
import type { Props } from '.';
import { FieldSelection } from '.';
import {
  GROUP_BY_LABEL,
  GROUP_BY_TOP_LABEL,
} from '../../../detections/components/alerts_kpis/common/translations';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

const defaultProps: Props = {
  setStackByField0: jest.fn(),
  setStackByField1: jest.fn(),
  stackByField0: 'kibana.alert.rule.name',
  stackByField1: 'host.name',
  uniqueQueryId: 'alerts-treemap-7cc69a83-1cd0-4d6e-89fa-f9010e9073db',
};

describe('FieldSelection', () => {
  test('it renders the (first) "Group by" selection', () => {
    render(
      <TestProviders>
        <FieldSelection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByRole('combobox', { name: GROUP_BY_LABEL })).toBeInTheDocument();
  });

  test('it renders the (second) "Group by top" selection', () => {
    render(
      <TestProviders>
        <FieldSelection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByRole('combobox', { name: GROUP_BY_TOP_LABEL })).toBeInTheDocument();
  });

  test('it renders the chart options context menu using the provided `uniqueQueryId`', () => {
    const propsWithContextMenu = {
      ...defaultProps,
      chartOptionsContextMenu: (queryId: string) => <div>{queryId}</div>,
    };

    render(
      <TestProviders>
        <FieldSelection {...propsWithContextMenu} />
      </TestProviders>
    );

    expect(screen.getByText(defaultProps.uniqueQueryId)).toBeInTheDocument();
  });

  test('it does NOT render the chart options context menu when `chartOptionsContextMenu` is undefined', () => {
    render(
      <TestProviders>
        <FieldSelection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByText(defaultProps.uniqueQueryId)).not.toBeInTheDocument();
  });
});
