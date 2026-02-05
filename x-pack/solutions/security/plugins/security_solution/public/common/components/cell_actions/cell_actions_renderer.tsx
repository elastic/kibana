/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolTipPositions } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import React, { useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { TimelineId } from '../../../../common/types';
import type { SecurityCellActionsData } from '.';
import { CellActionsMode, SecurityCellActions, SecurityCellActionType } from '.';
import { getSourcererScopeId } from '../../../helpers';
import { TimelineContext } from '../../../timelines/components/timeline/context';
import { TruncatableText } from '../truncatable_text';
import { TableContext } from '../events_viewer/shared';
import {
  disableHoverActions,
  tooltipContentIsExplicitlyNull,
  getDefaultWhenTooltipIsUnspecified,
} from './utils';

export const ProviderContentWrapper = styled.span`
  > span.euiToolTipAnchor {
    display: block; /* allow EuiTooltip content to be truncatable */
  }

  > span.euiToolTipAnchor.eui-textTruncate {
    display: inline-block; /* do not override display when a tooltip is truncated via eui-textTruncate */
  }
`;

export interface CellActionsRendererProps {
  hideTopN?: boolean;
  field: string;
  value?: string | number | null;
  queryValue?: string | null;
  children?: React.ReactNode;
  scopeId?: string;
  tooltipContent?: React.ReactNode;
  tooltipPosition?: ToolTipPositions;
  truncate?: boolean;
}

/**
 * Renders the content of the cell actions, wrapped in a tooltip
 */
export const Content = React.memo<{
  children?: React.ReactNode;
  field: string;
  tooltipContent?: React.ReactNode;
  tooltipPosition?: ToolTipPositions;
  value?: string | number | null;
}>(({ children, field, tooltipContent, tooltipPosition, value }) =>
  !tooltipContentIsExplicitlyNull(tooltipContent) ? (
    <EuiToolTip
      data-test-subj={`${field}-tooltip`}
      position={tooltipPosition}
      content={getDefaultWhenTooltipIsUnspecified({ tooltipContent, field })}
    >
      <>{children ? children : value}</>
    </EuiToolTip>
  ) : (
    <>{children ? children : value}</>
  )
);

Content.displayName = 'Content';

/**
 * Renders cell actions content (or an arbitrary visualization specified by `children`)
 * that's only displayed when the specified value is non-`null`.
 * @param field - the name of the field, e.g. `network.transport`
 * @param value - value of the field e.g. `tcp`
 * @param children - defaults to displaying `value`, this allows an arbitrary visualization to be displayed in lieu of the default behavior
 * @param tooltipContent - defaults to displaying `field`, pass `null` to
 * prevent a tooltip from being displayed, or pass arbitrary content
 * @param tooltipPosition - defaults to eui's default tooltip position
 * @param queryValue - defaults to `value`, this query overrides the `queryMatch.value` used by the `DataProvider` that represents the data
 * @param hideTopN - defaults to `false`, when true, the option to aggregate this field will be hidden
 * @param scopeId - the id of the scope, e.g. `timelineId` or `tableId`
 * @param truncate - defaults to `false`, when true, the content will be truncated
 */
export const CellActionsRenderer = React.memo<CellActionsRendererProps>(
  ({
    hideTopN = false,
    field,
    value,
    children,
    scopeId = TimelineId.active,
    tooltipContent,
    tooltipPosition,
    queryValue,
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
              <Content
                field={field}
                tooltipContent={tooltipContent}
                tooltipPosition={tooltipPosition}
                value={value}
              >
                {children}
              </Content>
            </TruncatableText>
          ) : (
            <ProviderContentWrapper data-test-subj={`render-content-${field}`}>
              <Content
                field={field}
                tooltipContent={tooltipContent}
                tooltipPosition={tooltipPosition}
                value={value}
              >
                {children}
              </Content>
            </ProviderContentWrapper>
          )}
        </div>
      ),
      [children, field, truncate, tooltipContent, tooltipPosition, value]
    );

    if (value == null) return null;

    if (disableHoverActions(scopeId)) {
      return <>{content}</>;
    }

    return (
      <SecurityCellActions
        mode={CellActionsMode.HOVER_DOWN}
        visibleCellActions={6}
        showActionTooltips
        triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
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

CellActionsRenderer.displayName = 'CellActionsRenderer';
