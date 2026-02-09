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
import type { EntityItem } from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import type { EventOrAlertItem } from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import { isEntityItem, isEventOrAlertItem } from '../../../../utils';
import {
  GROUPED_ITEM_TITLE_TEST_ID_LINK,
  GROUPED_ITEM_TITLE_TEST_ID_TEXT,
  GROUPED_ITEM_TITLE_TOOLTIP_TEST_ID,
} from '../../../test_ids';
import { emitGroupedItemClick } from '../../../events';
import { displayEntityName, displayEventName } from '../utils';

const entityUnavailableTooltip = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.entityUnavailable.tooltip',
  {
    defaultMessage: 'Entity unavailable in entity store',
  }
);

export interface HeaderRowProps {
  item: EntityItem | EventOrAlertItem;
}

export const HeaderRow = ({ item }: HeaderRowProps) => {
  const { euiTheme } = useEuiTheme();
  const title = useMemo(() => {
    if (isEventOrAlertItem(item)) {
      return displayEventName(item);
    }
    return displayEntityName(item);
  }, [item]);

  const isEntity = isEntityItem(item);
  const isEventOrAlert = isEventOrAlertItem(item);
  const isClickable = isEventOrAlert || (isEntity && item.availableInEntityStore);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {isEventOrAlert && item.isAlert && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="warningFilled" size="m" color="danger" />
        </EuiFlexItem>
      )}
      {isEntity && item.icon && (
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
              emitGroupedItemClick(item);
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
    </EuiFlexGroup>
  );
};
