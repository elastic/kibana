/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCheckbox,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  EuiFilterButton,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EntityColumnId } from '../types';
import { COLUMNS } from '../entities_logic';

const I18N_PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.entities';

/** Localized short label for each column in the configurator. */
const colLabel = (id: EntityColumnId): string => {
  const map: Record<EntityColumnId, string> = {
    name: i18n.translate(`${I18N_PREFIX}.col.name`, { defaultMessage: 'Name' }),
    criticality: i18n.translate(`${I18N_PREFIX}.col.criticality`, {
      defaultMessage: 'Criticality',
    }),
    risk: i18n.translate(`${I18N_PREFIX}.col.risk`, { defaultMessage: 'Risk score' }),
    alerts: i18n.translate(`${I18N_PREFIX}.col.alerts`, { defaultMessage: 'Alerts' }),
    uncased: i18n.translate(`${I18N_PREFIX}.col.uncased`, { defaultMessage: 'Uncased alerts' }),
    rules: i18n.translate(`${I18N_PREFIX}.col.rules`, { defaultMessage: 'Rules firing' }),
    anoms: i18n.translate(`${I18N_PREFIX}.col.anoms`, { defaultMessage: 'Anomalies' }),
    attacks: i18n.translate(`${I18N_PREFIX}.col.attacks`, { defaultMessage: 'Attacks' }),
    cases: i18n.translate(`${I18N_PREFIX}.col.cases`, { defaultMessage: 'Cases' }),
    watchlists: i18n.translate(`${I18N_PREFIX}.col.watchlists`, { defaultMessage: 'Watchlists' }),
    identity: i18n.translate(`${I18N_PREFIX}.col.identity`, { defaultMessage: 'Resolution group' }),
    firstSeen: i18n.translate(`${I18N_PREFIX}.col.firstSeen`, { defaultMessage: 'First seen' }),
    lastSeen: i18n.translate(`${I18N_PREFIX}.col.lastSeen`, { defaultMessage: 'Last seen' }),
    lastAlert: i18n.translate(`${I18N_PREFIX}.col.lastAlert`, { defaultMessage: 'Last alert' }),
  };
  return map[id];
};

export interface ColumnsConfiguratorProps {
  order: EntityColumnId[];
  visible: EntityColumnId[];
  onReorder: (order: EntityColumnId[]) => void;
  onToggle: (id: EntityColumnId, visible: boolean) => void;
  onReset: () => void;
}

/** The ⊞ Columns popover: show/hide, drag-reorder, pinned Name, reset. */
export const ColumnsConfigurator: React.FC<ColumnsConfiguratorProps> = ({
  order,
  visible,
  onReorder,
  onToggle,
  onReset,
}) => {
  const { euiTheme } = useEuiTheme();
  const [open, setOpen] = useState(false);
  const visibleSet = new Set(visible);
  const totalCols = COLUMNS.length;

  return (
    <EuiPopover
      aria-label={i18n.translate(`${I18N_PREFIX}.columns.button`, { defaultMessage: 'Columns' })}
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downRight"
      button={
        <EuiFilterButton
          iconType="tableDensityLow"
          onClick={() => setOpen((v) => !v)}
          isSelected={open}
          numFilters={totalCols}
          numActiveFilters={visible.length + 1}
          hasActiveFilters
          data-test-subj="entityIntelligenceEntitiesColumnsButton"
        >
          {i18n.translate(`${I18N_PREFIX}.columns.button`, { defaultMessage: 'Columns' })}
        </EuiFilterButton>
      }
    >
      <div style={{ width: 260 }}>
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 6px;
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          <EuiCheckbox
            id="entities-col-name"
            checked
            disabled
            onChange={() => {}}
            label={colLabel('name')}
          />
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              margin-left: auto;
              font-style: italic;
            `}
          >
            {i18n.translate(`${I18N_PREFIX}.columns.pinned`, { defaultMessage: 'pinned' })}
          </EuiText>
        </div>
        <EuiHorizontalRule margin="xs" />
        <EuiDragDropContext
          onDragEnd={({ source, destination }) => {
            if (source && destination) {
              onReorder(euiDragDropReorder(order, source.index, destination.index));
            }
          }}
        >
          <EuiDroppable droppableId="entitiesColumns" spacing="none">
            {order.map((id, index) => (
              <EuiDraggable
                key={id}
                index={index}
                draggableId={id}
                spacing="s"
                hasInteractiveChildren
              >
                {() => (
                  <div
                    css={css`
                      display: flex;
                      align-items: center;
                      gap: 6px;
                      padding: 2px 4px;
                    `}
                  >
                    <EuiIcon type="drag" size="s" color="subdued" aria-hidden={true} />
                    <EuiCheckbox
                      id={`entities-col-${id}`}
                      checked={visibleSet.has(id)}
                      onChange={(e) => onToggle(id, e.target.checked)}
                      label={colLabel(id)}
                    />
                  </div>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
        <EuiPopoverFooter>
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            onClick={onReset}
            data-test-subj="entityIntelligenceEntitiesColumnsReset"
          >
            {i18n.translate(`${I18N_PREFIX}.columns.reset`, { defaultMessage: 'Reset columns' })}
          </EuiButtonEmpty>
        </EuiPopoverFooter>
      </div>
    </EuiPopover>
  );
};
