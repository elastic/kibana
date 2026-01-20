/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  DOCUMENT_TYPE_ENTITY,
  DOCUMENT_TYPE_EVENT,
  DOCUMENT_TYPE_ALERT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import {
  GROUPED_ITEM_TITLE_TEST_ID_LINK,
  GROUPED_ITEM_TITLE_TEST_ID_TEXT,
  GROUPED_ITEM_TITLE_TOOLTIP_TEST_ID,
} from '../../../test_ids';
import { emitPreviewAction } from '../../../../preview_pub_sub';
import type { EntityOrEventItem, EntityItem, EventItem, AlertItem } from '../types';
import { displayEntityName, displayEventName } from '../utils';
import { EntityActionsButton } from './entity_actions_button';
import { EventActionsButton } from './event_actions_button';

const entityUnavailableTooltip = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.entityUnavailable.tooltip',
  {
    defaultMessage: 'Entity unavailable in entity store',
  }
);

export interface HeaderRowProps {
  item: EntityOrEventItem;
}

export const HeaderRow = ({ item }: HeaderRowProps) => {
  const { euiTheme } = useEuiTheme();
  const title = useMemo(() => {
    switch (item.itemType) {
      case DOCUMENT_TYPE_EVENT:
      case DOCUMENT_TYPE_ALERT:
        return displayEventName(item);
      case DOCUMENT_TYPE_ENTITY:
        return displayEntityName(item);
    }
  }, [item]);

  const isClickable =
    item.itemType === DOCUMENT_TYPE_EVENT ||
    item.itemType === DOCUMENT_TYPE_ALERT ||
    (item.itemType === DOCUMENT_TYPE_ENTITY && item.availableInEntityStore);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {item.itemType === DOCUMENT_TYPE_ALERT && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="warningFilled" size="m" color="danger" />
        </EuiFlexItem>
      )}
      {item.itemType === DOCUMENT_TYPE_ENTITY && item.icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={item.icon}
            size="m"
            color="primary"
            css={css`
              /* Icon is 1px mis-aligned vs link (entity name) */
              position: relative;
              top: 1px;
            `}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={css`
          min-width: 0;
        `}
      >
        {isClickable ? (
          <EuiLink
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              emitPreviewAction(item);
            }}
            color="primary"
            css={css`
              display: block;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              font-weight: ${euiTheme.font.weight.semiBold};
              width: 100%;
            `}
            data-test-subj={GROUPED_ITEM_TITLE_TEST_ID_LINK}
          >
            {title}
          </EuiLink>
        ) : (
          <EuiToolTip
            content={entityUnavailableTooltip}
            position="left"
            data-test-subj={GROUPED_ITEM_TITLE_TOOLTIP_TEST_ID}
          >
            <EuiText
              size="s"
              color="text"
              tabIndex={0}
              data-test-subj={GROUPED_ITEM_TITLE_TEST_ID_TEXT}
              css={css`
                font-weight: ${euiTheme.font.weight.medium};
              `}
            >
              {title}
            </EuiText>
          </EuiToolTip>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {item.itemType === DOCUMENT_TYPE_ENTITY ? (
          <EntityActionsButton item={item as EntityItem} />
        ) : (
          <EventActionsButton item={item as EventItem | AlertItem} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
