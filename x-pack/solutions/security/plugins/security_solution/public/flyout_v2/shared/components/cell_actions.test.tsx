/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TimelineId } from '../../../../common/types/timeline';
import { PageScope } from '../../../data_view_manager';
import { cellActionRenderer, createCellActionRenderer } from './cell_actions';

const mockSecurityCellActions = jest.fn((props: Record<string, unknown>) => (
  <div data-test-subj="cell-actions">{props.children as React.ReactNode}</div>
));

jest.mock('../../../common/components/cell_actions', () => ({
  SecurityCellActions: (props: Record<string, unknown>) => mockSecurityCellActions(props),
  CellActionsMode: { HOVER_DOWN: 'hover-down' },
}));

const renderCellAction = (renderer: ReturnType<typeof createCellActionRenderer>, scopeId: string) =>
  render(
    <>
      {renderer({
        field: 'host.name',
        value: ['host-1'],
        scopeId,
        children: <span>{'child'}</span>,
      })}
    </>
  );

describe('cellActionRenderer', () => {
  beforeEach(() => {
    mockSecurityCellActions.mockClear();
  });

  describe('createCellActionRenderer', () => {
    it('uses the bound scopeId for metadata and sourcerer scope', () => {
      renderCellAction(createCellActionRenderer(TimelineId.active), '');

      expect(mockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { scopeId: TimelineId.active },
          sourcererScopeId: PageScope.timeline,
        })
      );
    });

    it('lets the bound scopeId win over the per-render scopeId', () => {
      renderCellAction(createCellActionRenderer(TimelineId.active), 'some-other-scope');

      expect(mockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { scopeId: TimelineId.active },
          sourcererScopeId: PageScope.timeline,
        })
      );
    });

    it('falls back to the per-render scopeId when no scope is bound', () => {
      renderCellAction(createCellActionRenderer(''), TimelineId.active);

      expect(mockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { scopeId: TimelineId.active },
          sourcererScopeId: PageScope.timeline,
        })
      );
    });
  });

  describe('cellActionRenderer (default)', () => {
    it('renders with the per-render scopeId and preserves empty-scope behavior', () => {
      renderCellAction(cellActionRenderer, '');

      expect(mockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { scopeId: '' },
          sourcererScopeId: PageScope.default,
        })
      );
    });
  });
});
