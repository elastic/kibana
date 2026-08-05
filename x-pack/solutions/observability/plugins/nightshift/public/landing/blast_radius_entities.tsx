/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import {
  getBlastRadiusEbtDetail,
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../common/ebt_constants';
import { nightshiftInteractiveSurfaceTransition } from '../common/transition';
import type { BlastRadiusChip } from './blast_radius_chips';

export const MAX_VISIBLE_BLAST_RADIUS_ENTITIES = 10;

interface BlastRadiusEntityButtonProps {
  chipKey: string;
  count: number;
  isSelected: boolean;
  name: string;
  onClick: () => void;
}

function BlastRadiusEntityButton({
  chipKey,
  count,
  isSelected,
  name,
  onClick,
}: BlastRadiusEntityButtonProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <button
      aria-label={i18n.translate('xpack.nightshift.blastRadiusChipAriaLabel', {
        defaultMessage: '{name}: {count}',
        values: { count, name },
      })}
      aria-pressed={isSelected}
      data-test-subj="blast-radius-chip"
      {...getEbtProps({
        action: isSelected
          ? NIGHTSHIFT_EBT_ACTIONS.CLEAR_BLAST_RADIUS_FILTER
          : NIGHTSHIFT_EBT_ACTIONS.FILTER_BY_BLAST_RADIUS,
        element: NIGHTSHIFT_EBT_ELEMENTS.BLAST_RADIUS,
        detail: getBlastRadiusEbtDetail(chipKey),
      })}
      css={css`
        align-items: center;
        background: ${isSelected
          ? euiTheme.colors.backgroundBaseDanger
          : euiTheme.colors.backgroundBasePlain};
        border: ${isSelected
          ? `${euiTheme.border.width.thin} solid ${euiTheme.colors.danger}`
          : euiTheme.border.thin};
        border-radius: ${euiTheme.size.base};
        box-sizing: border-box;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        gap: ${euiTheme.size.xs};
        height: ${euiTheme.size.xl};
        min-width: auto;
        padding: 0 calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
        transition: ${nightshiftInteractiveSurfaceTransition(euiTheme)};

        &:hover {
          background: ${isSelected
            ? euiTheme.colors.backgroundBaseDanger
            : euiTheme.colors.backgroundBaseInteractiveHover};
          border-color: ${isSelected
            ? euiTheme.colors.danger
            : euiTheme.colors.borderInteractiveFormsHoverPlain};
        }

        &:focus-visible {
          outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
          outline-offset: ${euiTheme.border.width.thin};
        }
      `}
      onClick={onClick}
      type="button"
    >
      <span
        css={css`
          align-items: center;
          display: inline-flex;
          padding: 0 calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
        `}
      >
        <EuiText size="xs">{name}</EuiText>
      </span>
      <EuiBadge
        color="danger"
        css={css`
          flex-shrink: 0;

          .euiBadge__content {
            align-items: center;
            display: flex;
            line-height: 1;
          }
        `}
      >
        {count}
      </EuiBadge>
    </button>
  );
}

export interface BlastRadiusEntitiesProps {
  entities: BlastRadiusChip[];
  onSelect: (chipKey: string) => void;
  selectedEntityKey?: string;
}

export function BlastRadiusEntities({
  entities,
  onSelect,
  selectedEntityKey,
}: BlastRadiusEntitiesProps): React.ReactElement | null {
  const { euiTheme } = useEuiTheme();
  const titleFontSize = useEuiFontSize('s');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [entities]);

  const hasOverflow = entities.length > MAX_VISIBLE_BLAST_RADIUS_ENTITIES;
  const visibleEntities = useMemo(() => {
    if (!hasOverflow || expanded) {
      return entities;
    }

    const collapsed = entities.slice(0, MAX_VISIBLE_BLAST_RADIUS_ENTITIES);
    if (!selectedEntityKey) {
      return collapsed;
    }

    const selectedIndex = entities.findIndex(({ key }) => key === selectedEntityKey);
    if (selectedIndex < 0 || selectedIndex < MAX_VISIBLE_BLAST_RADIUS_ENTITIES) {
      return collapsed;
    }

    // Keep the active filter chip visible when collapsing past the first page.
    return [...collapsed.slice(0, MAX_VISIBLE_BLAST_RADIUS_ENTITIES - 1), entities[selectedIndex]];
  }, [entities, expanded, hasOverflow, selectedEntityKey]);
  const hiddenCount = Math.max(entities.length - visibleEntities.length, 0);

  if (entities.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem
      css={css`
        margin-top: ${euiTheme.size.l};
      `}
    >
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="m"
        css={css`
          border-radius: ${euiTheme.size.s};
        `}
      >
        <span
          css={css`
            ${titleFontSize}
            display: block;
            font-weight: ${euiTheme.font.weight.medium};
            margin-bottom: ${euiTheme.size.m};
          `}
        >
          {i18n.translate('xpack.nightshift.blastRadiusTitle', {
            defaultMessage: 'Impacted entities',
          })}
        </span>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          responsive={false}
          wrap={true}
          css={css`
            gap: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
          `}
        >
          {visibleEntities.map(({ count, key, name }) => (
            <EuiFlexItem grow={false} key={key}>
              <BlastRadiusEntityButton
                chipKey={key}
                count={count}
                isSelected={selectedEntityKey === key}
                name={name}
                onClick={() => onSelect(key)}
              />
            </EuiFlexItem>
          ))}
          {hasOverflow && !expanded && (
            <EuiFlexItem
              grow={false}
              css={css`
                margin-left: ${euiTheme.size.xxs};
              `}
            >
              <EuiButtonEmpty
                data-test-subj="blast-radius-show-more"
                flush="left"
                onClick={() => setExpanded(true)}
                size="xs"
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.EXPAND_BLAST_RADIUS,
                  element: NIGHTSHIFT_EBT_ELEMENTS.BLAST_RADIUS,
                })}
              >
                {i18n.translate('xpack.nightshift.blastRadiusShowMore', {
                  defaultMessage: '+{count} more',
                  values: { count: hiddenCount },
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {hasOverflow && expanded && (
            <EuiFlexItem
              grow={false}
              css={css`
                margin-left: ${euiTheme.size.xxs};
              `}
            >
              <EuiButtonEmpty
                data-test-subj="blast-radius-show-less"
                flush="left"
                onClick={() => setExpanded(false)}
                size="xs"
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.COLLAPSE_BLAST_RADIUS,
                  element: NIGHTSHIFT_EBT_ELEMENTS.BLAST_RADIUS,
                })}
              >
                {i18n.translate('xpack.nightshift.blastRadiusShowLess', {
                  defaultMessage: 'Show less',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
}
