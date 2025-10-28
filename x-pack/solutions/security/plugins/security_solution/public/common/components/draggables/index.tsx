/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';
import type { CellActionsRendererProps } from '../cell_actions/cell_actions_renderer';
import { CellActionsRenderer } from '../cell_actions/cell_actions_renderer';
import { getEmptyStringTag } from '../empty_value';

export const Badge = styled(EuiBadge)`
  vertical-align: top;
`;

Badge.displayName = 'Badge';

export type BadgeType = CellActionsRendererProps & {
  iconType?: IconType;
  // Teporary workaround accept these unused props
  // TODO: remove these props in all DraggableBadge components
  id?: string;
  contextId?: string;
  eventId?: string;
  isAggregatable?: boolean;
  fieldType?: string;
  name?: string;
};

/**
 * A draggable badge that's only displayed when the specified value is non-`null`.
 *
 * @param field - the name of the field, e.g. `network.transport`
 * @param value - value of the field e.g. `tcp`
 * @param iconType -the (optional) type of icon e.g. `snowflake` to display on the badge
 * @param name - defaulting to `field`, this optional human readable name is used by the `DataProvider` that represents the data
 * @param children - defaults to displaying `value`, this allows an arbitrary visualization to be displayed in lieu of the default behavior
 * @param tooltipContent - defaults to displaying `field`, pass `null` to
 * prevent a tooltip from being displayed, or pass arbitrary content
 * @param queryValue - defaults to `value`, this query overrides the `queryMatch.value` used by the `DataProvider` that represents the data
 */
const DraggableBadgeComponent: React.FC<BadgeType> = ({
  field,
  value,
  iconType,
  children,
  scopeId,
  tooltipContent,
  queryValue,
}) =>
  value != null ? (
    <CellActionsRenderer
      field={field}
      value={value}
      scopeId={scopeId}
      tooltipContent={tooltipContent}
      queryValue={queryValue}
    >
      <Badge iconType={iconType} color="hollow" title="">
        {children ? children : value !== '' ? value : getEmptyStringTag()}
      </Badge>
    </CellActionsRenderer>
  ) : null;

DraggableBadgeComponent.displayName = 'DraggableBadgeComponent';

export const DraggableBadge = React.memo(DraggableBadgeComponent);
DraggableBadge.displayName = 'DraggableBadge';
