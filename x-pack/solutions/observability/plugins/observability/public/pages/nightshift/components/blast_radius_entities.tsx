/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface BlastRadiusEntity {
  count: number;
  name: string;
}

interface BlastRadiusEntityButtonProps extends BlastRadiusEntity {
  isSelected: boolean;
  onClick: () => void;
}

function BlastRadiusEntityButton({
  count,
  isSelected,
  name,
  onClick,
}: BlastRadiusEntityButtonProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <button
      aria-label={i18n.translate('xpack.observability.nightshift.blastRadiusChipAriaLabel', {
        defaultMessage: '{name}: {count}',
        values: { count, name },
      })}
      aria-pressed={isSelected}
      data-test-subj="blast-radius-chip"
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
        display: inline-flex;
        font: inherit;
        height: ${euiTheme.size.xl};
        min-width: auto;
        padding: 0 calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});

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
          display: flex;
          padding: 0 calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
        `}
      >
        <EuiText size="xs">{name}</EuiText>
      </span>
      <EuiBadge color="danger">{count}</EuiBadge>
    </button>
  );
}

export interface BlastRadiusEntitiesProps {
  entities: BlastRadiusEntity[];
  onSelect: (name: string) => void;
  selectedEntity?: string;
}

export function BlastRadiusEntities({
  entities,
  onSelect,
  selectedEntity,
}: BlastRadiusEntitiesProps): React.ReactElement | null {
  const { euiTheme } = useEuiTheme();
  const titleFontSize = useEuiFontSize('s');

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
          {i18n.translate('xpack.observability.nightshift.blastRadiusTitle', {
            defaultMessage: 'Blast radius',
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
          {entities.map(({ count, name }) => (
            <EuiFlexItem grow={false} key={name}>
              <BlastRadiusEntityButton
                count={count}
                isSelected={selectedEntity === name}
                name={name}
                onClick={() => onSelect(name)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
}
