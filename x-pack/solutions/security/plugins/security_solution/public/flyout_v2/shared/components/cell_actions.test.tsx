/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TableId } from '@kbn/securitysolution-data-table';
import {
  SECURITY_CELL_ACTIONS_DEFAULT,
  SECURITY_CELL_ACTIONS_DETAILS_FLYOUT,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { AlertsTableImperativeApi } from '@kbn/response-ops-alerts-table/types';
import { TimelineId } from '../../../../common/types/timeline';
import { PageScope } from '../../../data_view_manager/constants';
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

    it('defaults to the slim default trigger with 5 visible actions', () => {
      renderCellAction(createCellActionRenderer(TimelineId.active), '');

      expect(mockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerId: SECURITY_CELL_ACTIONS_DEFAULT,
          visibleCellActions: 5,
        })
      );
    });

    it('uses the details-flyout trigger, visible count and alertsTableRef when provided', () => {
      const alertsTableRef = React.createRef<AlertsTableImperativeApi>();

      renderCellAction(
        createCellActionRenderer(TableId.alertsOnAlertsPage, {
          triggerId: SECURITY_CELL_ACTIONS_DETAILS_FLYOUT,
          visibleCellActions: 6,
          alertsTableRef,
        }),
        ''
      );

      expect(mockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerId: SECURITY_CELL_ACTIONS_DETAILS_FLYOUT,
          visibleCellActions: 6,
          metadata: { scopeId: TableId.alertsOnAlertsPage, alertsTableRef },
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
