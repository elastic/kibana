/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import { QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import { isComputedFeature } from '@kbn/significant-events-schema';
import React, { useMemo, useState } from 'react';
import {
  useKnowledgeIndicatorActions,
  DELETE_LABEL,
  EXCLUDE_LABEL,
  RESTORE_LABEL,
  PROMOTE_LABEL,
} from '../../hooks/use_knowledge_indicator_actions';
import { durabilityMenuItem } from '../durability_menu_item';
import { useBlocksNewActivity } from '../../../../../data/maintenance/use_significant_events_maintenance';
import { STATS_PROMOTE_DISABLED_TOOLTIP } from '../../translations';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../../../../../common/ebt_constants';

interface Props {
  knowledgeIndicator: KnowledgeIndicator;
  onDeleteRequest: (knowledgeIndicator: KnowledgeIndicator) => void;
}

export function KnowledgeIndicatorActionsCell({ knowledgeIndicator, onDeleteRequest }: Props) {
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  const { excludeFeature, restoreFeature, promoteQuery, setDurability, isMutating } =
    useKnowledgeIndicatorActions();

  const featureActionItems = useMemo(() => {
    if (knowledgeIndicator.kind !== 'feature') {
      return [];
    }

    const items: React.ReactElement[] = [];
    const computed = isComputedFeature(knowledgeIndicator.feature);

    if (!computed) {
      if (knowledgeIndicator.feature.excluded) {
        items.push(
          <EuiContextMenuItem
            key="feature-restore"
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.RESTORE_KNOWLEDGE_INDICATOR,
              element: NIGHTSHIFT_EBT_ELEMENTS.KNOWLEDGE_INDICATORS_TABLE,
            })}
            icon="eye"
            disabled={isMutating}
            onClick={() => {
              setIsActionsMenuOpen(false);
              restoreFeature(knowledgeIndicator.feature);
            }}
          >
            {RESTORE_LABEL}
          </EuiContextMenuItem>
        );
      } else {
        items.push(
          <EuiContextMenuItem
            key="feature-exclude"
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.EXCLUDE_KNOWLEDGE_INDICATOR,
              element: NIGHTSHIFT_EBT_ELEMENTS.KNOWLEDGE_INDICATORS_TABLE,
            })}
            icon="eyeSlash"
            disabled={isMutating}
            onClick={() => {
              setIsActionsMenuOpen(false);
              excludeFeature(knowledgeIndicator.feature);
            }}
          >
            {EXCLUDE_LABEL}
          </EuiContextMenuItem>
        );
      }

      items.push(
        durabilityMenuItem({
          knowledgeIndicator,
          disabled: isMutating,
          onToggle: (durable) => {
            setIsActionsMenuOpen(false);
            setDurability({ knowledgeIndicator, durable });
          },
        })
      );
    }

    items.push(
      <EuiContextMenuItem
        key="feature-delete"
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.DELETE_KNOWLEDGE_INDICATOR,
          element: NIGHTSHIFT_EBT_ELEMENTS.KNOWLEDGE_INDICATORS_TABLE,
        })}
        icon="trash"
        color="danger"
        disabled={isMutating}
        onClick={() => {
          setIsActionsMenuOpen(false);
          onDeleteRequest(knowledgeIndicator);
        }}
      >
        {DELETE_LABEL}
      </EuiContextMenuItem>
    );

    return items;
  }, [
    excludeFeature,
    isMutating,
    knowledgeIndicator,
    onDeleteRequest,
    restoreFeature,
    setDurability,
  ]);

  const queryActionItems = useMemo(() => {
    if (knowledgeIndicator.kind !== 'query') return [];

    const isStats = knowledgeIndicator.query.type === QUERY_TYPE_STATS;
    const isPromoteDisabled =
      isMutating || blocksActivity || knowledgeIndicator.rule.backed || isStats;
    const promoteTooltip =
      activityBlockTooltip ?? (isStats ? STATS_PROMOTE_DISABLED_TOOLTIP : undefined);

    return [
      <EuiContextMenuItem
        key="query-promote"
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.PROMOTE_KNOWLEDGE_INDICATOR,
          element: NIGHTSHIFT_EBT_ELEMENTS.KNOWLEDGE_INDICATORS_TABLE,
        })}
        icon="plusCircle"
        disabled={isPromoteDisabled}
        toolTipContent={promoteTooltip}
        onClick={() => {
          setIsActionsMenuOpen(false);
          promoteQuery(knowledgeIndicator.query.id);
        }}
      >
        {PROMOTE_LABEL}
      </EuiContextMenuItem>,
      durabilityMenuItem({
        knowledgeIndicator,
        disabled: isMutating,
        onToggle: (durable) => {
          setIsActionsMenuOpen(false);
          setDurability({ knowledgeIndicator, durable });
        },
      }),
      <EuiContextMenuItem
        key="query-delete"
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.DELETE_KNOWLEDGE_INDICATOR,
          element: NIGHTSHIFT_EBT_ELEMENTS.KNOWLEDGE_INDICATORS_TABLE,
        })}
        icon="trash"
        disabled={isMutating}
        onClick={() => {
          setIsActionsMenuOpen(false);
          onDeleteRequest(knowledgeIndicator);
        }}
      >
        {DELETE_LABEL}
      </EuiContextMenuItem>,
    ];
  }, [
    activityBlockTooltip,
    blocksActivity,
    isMutating,
    knowledgeIndicator,
    onDeleteRequest,
    promoteQuery,
    setDurability,
  ]);

  return (
    <EuiPopover
      aria-label={ACTIONS_MENU_POPOVER_ARIA_LABEL}
      button={
        <EuiToolTip content={ACTIONS_MENU_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj="significantEventsAppKnowledgeIndicatorActionsCellButton"
            iconType="boxesVertical"
            aria-label={ACTIONS_MENU_BUTTON_ARIA_LABEL}
            isLoading={isMutating}
            isDisabled={isMutating}
            onClick={() => setIsActionsMenuOpen((current) => !current)}
          />
        </EuiToolTip>
      }
      isOpen={isActionsMenuOpen}
      closePopover={() => setIsActionsMenuOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel items={[...featureActionItems, ...queryActionItems]} />
    </EuiPopover>
  );
}

const ACTIONS_MENU_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.significantEventsTable.actionsMenuButtonAriaLabel',
  {
    defaultMessage: 'Knowledge indicator actions',
  }
);

const ACTIONS_MENU_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.significantEventsTable.actionsMenuPopoverAriaLabel',
  {
    defaultMessage: 'Knowledge indicator actions menu',
  }
);
