/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  useNodeDetailsPopover,
  type UseNodeDetailsPopoverReturn,
} from '../../popovers/details/use_node_details_popover';
import { PlusCountBadge } from '../plus_count_badge/plus_count_badge';
import {
  GRAPH_ENTITY_IDS_VALUE_ID,
  GRAPH_ENTITY_IDS_PLUS_COUNT_BUTTON_ID,
  GRAPH_ENTITY_IDS_PLUS_COUNT_ID,
  GRAPH_ENTITY_IDS_POPOVER_CONTENT_ID,
  GRAPH_ENTITY_IDS_POPOVER_ITEM_ID,
  GRAPH_ENTITY_IDS_POPOVER_ID,
} from '../../test_ids';

export const VISIBLE_ENTITY_IDS_LIMIT = 1;

const popoverAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.entityIds.popoverAriaLabel',
  {
    defaultMessage: 'Show entity ID details',
  }
);

export type UseEntityIdsPopoverReturn = UseNodeDetailsPopoverReturn & {
  onEntityIdClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const useEntityIdsPopover = (entityIds: string[]): UseEntityIdsPopoverReturn => {
  const items = entityIds.map((entityId, index) => ({
    key: `${index}-${entityId}`,
    label: entityId,
  }));

  const { id, onClick, PopoverComponent, actions, state } = useNodeDetailsPopover({
    popoverId: 'entity-ids-popover',
    items,
    contentTestSubj: GRAPH_ENTITY_IDS_POPOVER_CONTENT_ID,
    itemTestSubj: GRAPH_ENTITY_IDS_POPOVER_ITEM_ID,
    popoverTestSubj: GRAPH_ENTITY_IDS_POPOVER_ID,
  });

  return {
    id,
    onEntityIdClick: onClick,
    PopoverComponent,
    actions,
    state,
    onClick,
  };
};

export interface EntityIdsProps {
  entityIds: string[];
  onEntityIdClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const EntityIds = ({ entityIds, onEntityIdClick }: EntityIdsProps) => {
  if (entityIds.length === 0) return null;

  const firstId = entityIds[0];
  const extraCount = entityIds.length - VISIBLE_ENTITY_IDS_LIMIT;

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" wrap={false}>
      <EuiFlexItem
        grow={false}
        css={css`
          min-width: 0;
        `}
      >
        <EuiText
          size="xs"
          data-test-subj={GRAPH_ENTITY_IDS_VALUE_ID}
          css={css`
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {firstId}
        </EuiText>
      </EuiFlexItem>
      {extraCount > 0 ? (
        <EuiFlexItem grow={false}>
          <PlusCountBadge
            count={extraCount}
            onClick={onEntityIdClick}
            ariaLabel={popoverAriaLabel}
            data-test-subj={
              onEntityIdClick
                ? GRAPH_ENTITY_IDS_PLUS_COUNT_BUTTON_ID
                : GRAPH_ENTITY_IDS_PLUS_COUNT_ID
            }
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

EntityIds.displayName = 'EntityIds';
