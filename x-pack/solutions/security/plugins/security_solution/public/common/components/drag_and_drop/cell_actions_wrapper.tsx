/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useContext, useMemo } from 'react';
import { TimelineId, type DataProvider } from '../../../../common/types';
import type { SecurityCellActionsData } from '../cell_actions';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionsTrigger,
  SecurityCellActionType,
} from '../cell_actions';
import { getSourcererScopeId } from '../../../helpers';
import { TimelineContext } from '../../../timelines/components/timeline';

import { TableContext } from '../events_viewer/shared';

type CellActionsWrapperProps = PropsWithChildren<{
  /**
   * The `dataProvider` is used to retrieve the `field` and `value` for the cell actions execution.
   * */
  dataProvider: DataProvider;
  /**
   * The `hideTopN` is used hide the show top N action. Defaults to `false`.
   * */
  hideTopN?: boolean;
  /**
   * The `scopeId` is used to determine the context of the cell actions execution.
   * If not provided this component will try to retrieve the timeline id or the table id from the context, in that order.
   * */
  scopeId?: string;
}>;

export const CellActionsWrapper = React.memo<PropsWithChildren<CellActionsWrapperProps>>(
  ({ dataProvider, scopeId = TimelineId.active, children, hideTopN = false }) => {
    const { timelineId: timelineIdFind } = useContext(TimelineContext);
    const { tableId: tableIdFind } = useContext(TableContext);

    const sourcererScopeId = useMemo(
      () => getSourcererScopeId(scopeId ?? timelineIdFind ?? tableIdFind),
      [scopeId, tableIdFind, timelineIdFind]
    );

    const data = useMemo<SecurityCellActionsData>(() => {
      const { value, field } = dataProvider.queryMatch;
      return { value: value || [], field };
    }, [dataProvider.queryMatch]);

    const disabledActionTypes = useMemo(
      () => (hideTopN ? [SecurityCellActionType.SHOW_TOP_N] : []),
      [hideTopN]
    );

    return (
      <SecurityCellActions
        mode={CellActionsMode.HOVER_DOWN}
        visibleCellActions={6}
        showActionTooltips
        triggerId={SecurityCellActionsTrigger.DEFAULT}
        data={data}
        disabledActionTypes={disabledActionTypes}
        sourcererScopeId={sourcererScopeId}
        metadata={{ scopeId }}
      >
        {children}
      </SecurityCellActions>
    );
  }
);

CellActionsWrapper.displayName = 'CellActionsWrapper';
