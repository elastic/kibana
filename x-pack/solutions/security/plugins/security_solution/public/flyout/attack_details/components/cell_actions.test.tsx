/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SECURITY_CELL_ACTIONS_DETAILS_FLYOUT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { PageScope } from '../../../data_view_manager/constants';
import { CellActions } from './cell_actions';

const MockedSecurityCellActions = jest.fn(({ children }) => <>{children}</>);

jest.mock('../../../common/components/cell_actions', () => ({
  ...jest.requireActual('../../../common/components/cell_actions'),
  SecurityCellActions: (props: { children?: React.ReactNode } & Record<string, unknown>) => {
    MockedSecurityCellActions(props);
    return <>{props.children}</>;
  },
}));

describe('CellActions (attack details flyout)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes triggerId, sourcererScopeId, data, and metadata to SecurityCellActions', () => {
    render(
      <CellActions field="host.ip" value={['127.0.0.1']} isObjectArray={false}>
        <span>{'child content'}</span>
      </CellActions>
    );

    const call = MockedSecurityCellActions.mock.calls[0][0];
    expect(call.triggerId).toBe(SECURITY_CELL_ACTIONS_DETAILS_FLYOUT);
    expect(call.sourcererScopeId).toBe(PageScope.attacks);
    expect(call.data).toEqual({ field: 'host.ip', value: ['127.0.0.1'] });
    expect(call.metadata).toEqual({ isObjectArray: false });
  });

  it('renders children', () => {
    render(
      <CellActions field="event.category" value={['threat']}>
        <span data-test-subj="child">{'child content'}</span>
      </CellActions>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('child content');
  });

  it('passes isObjectArray in metadata when true', () => {
    render(
      <CellActions field="some.field" value={['a']} isObjectArray={true}>
        <span>{'child'}</span>
      </CellActions>
    );

    expect(MockedSecurityCellActions).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { isObjectArray: true },
      })
    );
  });
});
