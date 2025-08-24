/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { TableId } from '@kbn/securitysolution-data-table';
import { TimelineId } from '../../../../common/types';
import type { PrimitiveOrArrayOfPrimitives } from '../../lib/kuery';
import type { SecurityCellActionsData } from '../cell_actions';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionsTrigger,
  SecurityCellActionType,
} from '../cell_actions';
import { getSourcererScopeId } from '../../../helpers';
import { TimelineContext } from '../../../timelines/components/timeline/context';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';
import { TruncatableText } from '../truncatable_text';
import { TableContext } from '../events_viewer/shared';

export const ProviderContentWrapper = styled.span`
  > span.euiToolTipAnchor {
    display: block; /* allow EuiTooltip content to be truncatable */
  }

  > span.euiToolTipAnchor.eui-textTruncate {
    display: inline-block; /* do not override display when a tooltip is truncated via eui-textTruncate */
  }
`;

export const disableHoverActions = (timelineId: string | undefined): boolean =>
  [TableId.rulePreview, ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID].includes(timelineId ?? '');

type CellActionsWrapperProps = PropsWithChildren<{
  /**
   * The `field` is the name of the field to be used in the cell actions execution.
   * */
  field: string;
  /**
   * The `value` is the value of the field to be used in the cell actions execution.
   * */
  value: PrimitiveOrArrayOfPrimitives;
  /**
   * The `queryValue` is the value of the field to be used in the cell actions execution.
   * */
  queryValue?: string | null;
  /**
   * The `hideTopN` is used hide the show top N action. Defaults to `false`.
   * */
  hideTopN?: boolean;
  /**
   * The `scopeId` is used to determine the context of the cell actions execution.
   * If not provided this component will try to retrieve the timeline id or the table id from the context, in that order.
   * */
  scopeId?: string;
  /**
   * The `truncate` is used to truncate the content of the cell actions wrapper.
   * */
  truncate?: boolean;
}>;

export const CellActionsWrapper = React.memo<PropsWithChildren<CellActionsWrapperProps>>(
  ({
    field,
    value,
    queryValue,
    scopeId = TimelineId.active,
    children,
    hideTopN = false,
    truncate = false,
  }) => {
    const { timelineId: timelineIdFind } = useContext(TimelineContext);
    const { tableId: tableIdFind } = useContext(TableContext);

    const sourcererScopeId = useMemo(
      () => getSourcererScopeId(scopeId ?? timelineIdFind ?? tableIdFind),
      [scopeId, tableIdFind, timelineIdFind]
    );

    const data = useMemo<SecurityCellActionsData>(() => {
      if (queryValue) {
        return { value: queryValue, field };
      }
      return { value: value || [], field };
    }, [value, field, queryValue]);

    const disabledActionTypes = useMemo(
      () => (hideTopN ? [SecurityCellActionType.SHOW_TOP_N] : []),
      [hideTopN]
    );

    const content = useMemo(
      () => (
        <div tabIndex={-1}>
          {truncate ? (
            <TruncatableText data-test-subj="render-truncatable-content">
              {children}
            </TruncatableText>
          ) : (
            <ProviderContentWrapper data-test-subj={`render-content-${field}`}>
              {children}
            </ProviderContentWrapper>
          )}
        </div>
      ),
      [children, field, truncate]
    );

    if (disableHoverActions(scopeId)) {
      return <>{content}</>;
    }

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
        {content}
      </SecurityCellActions>
    );
  }
);

CellActionsWrapper.displayName = 'CellActionsWrapper';
