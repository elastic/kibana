/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType, ToolTipPositions } from '@elastic/eui';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';
import { CellActionsWrapper } from '../drag_and_drop/cell_actions_wrapper';
import { getEmptyStringTag } from '../empty_value';

export interface DefaultDraggableType {
  hideTopN?: boolean;
  id?: string;
  fieldType?: string;
  isAggregatable?: boolean;
  field: string;
  value?: string | number | null;
  name?: string | null;
  queryValue?: string | null;
  children?: React.ReactNode;
  scopeId?: string;
  tooltipContent?: React.ReactNode;
  tooltipPosition?: ToolTipPositions;
  truncate?: boolean;
}

/**
 * Only returns true if the specified tooltipContent is exactly `null`.
 * Example input / output:
 * `bob -> false`
 * `undefined -> false`
 * `<span>thing</span> -> false`
 * `null -> true`
 */
export const tooltipContentIsExplicitlyNull = (tooltipContent?: React.ReactNode): boolean =>
  tooltipContent === null; // an explicit / exact null check

/**
 * Derives the tooltip content from the field name if no tooltip was specified
 */
export const getDefaultWhenTooltipIsUnspecified = ({
  field,
  tooltipContent,
}: {
  field: string;
  tooltipContent?: React.ReactNode;
}): React.ReactNode => (tooltipContent != null ? tooltipContent : field);

/**
 * Renders the content of the draggable, wrapped in a tooltip
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
 * Renderedtext (or an arbitrary visualization specified by `children`)
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
export const DefaultDraggable = React.memo<DefaultDraggableType>(
  ({
    hideTopN = false,
    field,
    value,
    children,
    scopeId,
    tooltipContent,
    tooltipPosition,
    queryValue,
    truncate,
  }) => {
    if (value == null) return null;

    return (
      <CellActionsWrapper
        field={field}
        value={queryValue ? queryValue : value ?? ''}
        hideTopN={hideTopN}
        scopeId={scopeId}
        truncate={truncate}
      >
        <Content
          field={field}
          tooltipContent={tooltipContent}
          tooltipPosition={tooltipPosition}
          value={value}
        >
          {children}
        </Content>
      </CellActionsWrapper>
    );
  }
);

DefaultDraggable.displayName = 'DefaultDraggable';

export const Badge = styled(EuiBadge)`
  vertical-align: top;
`;

Badge.displayName = 'Badge';

export type BadgeDraggableType = Omit<DefaultDraggableType, 'id'> & {
  contextId?: string;
  eventId?: string;
  iconType?: IconType;
  isAggregatable?: boolean;
  fieldType?: string;
  name?: string;
};

/**
 * A draggable badge that's only displayed when the specified value is non-`null`.
 *
 * @param contextId - used as part of the formula to derive a unique draggable id, this describes the context e.g. `event-fields-browser` in which the badge is displayed
 * @param eventId - uniquely identifies an event, as specified in the `_id` field of the document
 * @param field - the name of the field, e.g. `network.transport`
 * @param value - value of the field e.g. `tcp`
 * @param iconType -the (optional) type of icon e.g. `snowflake` to display on the badge
 * @param name - defaulting to `field`, this optional human readable name is used by the `DataProvider` that represents the data
 * @param children - defaults to displaying `value`, this allows an arbitrary visualization to be displayed in lieu of the default behavior
 * @param tooltipContent - defaults to displaying `field`, pass `null` to
 * prevent a tooltip from being displayed, or pass arbitrary content
 * @param queryValue - defaults to `value`, this query overrides the `queryMatch.value` used by the `DataProvider` that represents the data
 */
const DraggableBadgeComponent: React.FC<BadgeDraggableType> = ({
  contextId,
  eventId,
  field,
  value,
  iconType,
  isAggregatable,
  fieldType,
  name,
  children,
  scopeId,
  tooltipContent,
  queryValue,
}) =>
  value != null ? (
    <DefaultDraggable  
      field={field}
      value={value}
      scopeId={scopeId}
      tooltipContent={tooltipContent}
      queryValue={queryValue}
    >
      <Badge iconType={iconType} color="hollow" title="">
        {children ? children : value !== '' ? value : getEmptyStringTag()}
      </Badge>
      </DefaultDraggable>
  ) : null;

DraggableBadgeComponent.displayName = 'DraggableBadgeComponent';

export const DraggableBadge = React.memo(DraggableBadgeComponent);
DraggableBadge.displayName = 'DraggableBadge';
