/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTextTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { EntityItem } from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import type { EventOrAlertItem } from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import { isEntityItem, isEventOrAlertItem } from '../../../../utils';
import {
  GROUPED_ITEM_TITLE_TEST_ID_LINK,
  GROUPED_ITEM_TITLE_TEST_ID_TEXT,
  GROUPED_ITEM_TITLE_TOOLTIP_TEST_ID,
} from '../../../test_ids';
import { displayEntityName, displayEventName } from '../utils';
import { EntityActionsButton } from './entity_actions_button';
import { EventActionsButton } from './event_actions_button';
import {
  GENERIC_ENTITY_PREVIEW_BANNER,
  DocumentDetailsPreviewPanelKey,
  GenericEntityPanelKey,
  ALERT_PREVIEW_BANNER,
  EVENT_PREVIEW_BANNER,
} from '../../../constants';

const entityUnavailableTooltip = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.entityUnavailable.tooltip',
  {
    defaultMessage: 'Entity unavailable in entity store',
  }
);

export interface HeaderRowProps {
  item: EntityItem | EventOrAlertItem;
  /** Unique identifier for the graph instance, used to scope filter state. */
  scopeId: string;
}

export const HeaderRow = ({ item, scopeId }: HeaderRowProps) => {
  const { euiTheme } = useEuiTheme();
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const title = useMemo(() => {
    if (isEventOrAlertItem(item)) {
      return displayEventName(item);
    }
    return displayEntityName(item);
  }, [item]);

  const handlePreviewClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      if (isEntityItem(item)) {
        openPreviewPanel({
          id: GenericEntityPanelKey,
          params: {
            entityId: item.id,
            scopeId,
            isPreviewMode: true,
            banner: GENERIC_ENTITY_PREVIEW_BANNER,
            isEngineMetadataExist: !!item.availableInEntityStore,
          },
        });
      } else {
        // event or alert
        openPreviewPanel({
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id: item.docId,
            indexName: item.index,
            scopeId,
            banner: item.isAlert ? ALERT_PREVIEW_BANNER : EVENT_PREVIEW_BANNER,
            isPreviewMode: true,
          },
        });
      }
    },
    [item, openPreviewPanel, scopeId]
  );

  const isEntity = isEntityItem(item);
  const isEventOrAlert = isEventOrAlertItem(item);
  const isClickable = isEventOrAlert || (isEntity && item.availableInEntityStore);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {isEventOrAlert && item.isAlert && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="warningFilled" size="m" color="danger" aria-hidden={true} />
        </EuiFlexItem>
      )}
      {isEntity && item.icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={item.icon}
            size="m"
            color="primary"
            aria-hidden={true}
            css={css`
              /* Icon is 1px mis-aligned vs link (entity name) */
              position: relative;
              top: 1px;
            `}
            aria-hidden={true}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={css`
          min-width: 0;
          overflow: hidden;
        `}
      >
        {isClickable ? (
          <EuiLink
            onClick={handlePreviewClick}
            color="primary"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
            data-test-subj={GROUPED_ITEM_TITLE_TEST_ID_LINK}
          >
            <EuiTextTruncate text={title} truncation="middle" />
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
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              <EuiTextTruncate text={title} truncation="middle" />
            </EuiText>
          </EuiToolTip>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isEntityItem(item) ? (
          <EntityActionsButton item={item} scopeId={scopeId} />
        ) : (
          <EventActionsButton item={item} scopeId={scopeId} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
