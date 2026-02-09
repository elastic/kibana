/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { readableColor } from 'polished';
import type { EsqlWaffleNode, LegendConfig, WaffleBounds } from '../../types';
import { getNodeColors } from '../../utils/color_from_value';
import { HEX_WIDTH_RATIO } from './waffle_utils';

// ============================================================================
// Types
// ============================================================================

export type WaffleNodeShape = 'square' | 'hexagon';

interface WaffleNodeProps {
  node: EsqlWaffleNode;
  size: number;
  legendConfig: LegendConfig;
  bounds: WaffleBounds;
  isSelected?: boolean;
  onClick?: (node: EsqlWaffleNode) => void;
  shape?: WaffleNodeShape;
}

// ============================================================================
// Constants
// ============================================================================

const HEXAGON_CLIP_PATH = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

// Size thresholds for content visibility
const THRESHOLD_LABEL = 50;
const THRESHOLD_VALUE = 35;
const THRESHOLD_ELLIPSIS = 20;

// ============================================================================
// Component
// ============================================================================

/**
 * A single tile in the waffle map representing a dimension value with its metric.
 * Supports both square (classic) and hexagon (Datadog-style) shapes.
 */
export const WaffleNode: React.FC<WaffleNodeProps> = ({
  node,
  size,
  legendConfig,
  bounds,
  isSelected = false,
  onClick,
  shape = 'hexagon',
}) => {
  const { euiTheme } = useEuiTheme();
  const isHexagon = shape === 'hexagon';

  // Memoize expensive calculations
  const { background, textColor, dimensions, contentVisibility } = useMemo(() => {
    const { background: bg } = getNodeColors(legendConfig, node.value, bounds);
    return {
      background: bg,
      textColor: readableColor(bg),
      dimensions: {
        width: isHexagon ? size * HEX_WIDTH_RATIO : size,
        height: size,
      },
      contentVisibility: {
        showLabel: size >= THRESHOLD_LABEL,
        showValue: size >= THRESHOLD_VALUE,
        showEllipsis: size >= THRESHOLD_ELLIPSIS && size < THRESHOLD_VALUE,
      },
    };
  }, [legendConfig, node.value, bounds, size, isHexagon]);

  const tooltipContent = i18n.translate('xpack.infra.esqlInventory.waffle.nodeTooltip', {
    defaultMessage: '{label}: {value}',
    values: { label: node.label, value: node.formattedValue },
  });

  const handleClick = () => onClick?.(node);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(node);
    }
  };

  // Common button styles
  const buttonStyles = css`
    position: relative;
    width: ${dimensions.width}px;
    height: ${dimensions.height}px;
    cursor: pointer;
    border: none;
    padding: 0;
    margin: 0;
    background: transparent;
    &:focus {
      outline: ${size < THRESHOLD_ELLIPSIS
        ? `${euiTheme.focus.width} solid ${euiTheme.focus.color}`
        : 'none'};
    }
  `;

  // Shape-specific styles
  const shapeStyles = css`
    background-color: ${background};
    ${isHexagon ? `clip-path: ${HEXAGON_CLIP_PATH};` : 'border-radius: 3px;'}
    ${!isHexagon && `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);`}
    ${isSelected && !isHexagon && `border: 2px solid ${euiTheme.colors.darkestShade};`}
  `;

  // Small node - compact colored shape only
  if (size < THRESHOLD_ELLIPSIS) {
    return (
      <EuiToolTip content={tooltipContent} position="top">
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label={tooltipContent}
          data-test-subj="esqlWaffleNode"
          css={css`
            ${buttonStyles}
            ${shapeStyles}
            outline: ${isSelected ? `2px solid ${euiTheme.colors.darkestShade}` : 'none'};
            outline-offset: -2px;
          `}
        />
      </EuiToolTip>
    );
  }

  // Regular node with content
  return (
    <EuiToolTip content={tooltipContent} position="top">
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={tooltipContent}
        data-test-subj="esqlWaffleNode"
        css={buttonStyles}
      >
        {/* Main shape with content */}
        <div
          css={css`
            position: absolute;
            inset: 0;
            ${shapeStyles}
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: ${isHexagon ? '0 15%' : '4px'};
            overflow: hidden;
            &:focus-within {
              outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
            }
          `}
        >
          {contentVisibility.showLabel && (
            <NodeText color={textColor} fontSize={size < 60 ? '9px' : '11px'}>
              {node.label}
            </NodeText>
          )}
          {contentVisibility.showValue && (
            <NodeText color={textColor} fontSize={size < 50 ? '10px' : '13px'} bold>
              {node.formattedValue}
            </NodeText>
          )}
          {contentVisibility.showEllipsis && (
            <NodeText color={textColor} fontSize="10px">
              {i18n.translate('xpack.infra.waffleNode.nodeText.Label', { defaultMessage: '...' })}
            </NodeText>
          )}
        </div>

        {/* Selection border for hexagons */}
        {isHexagon && isSelected && (
          <div
            css={css`
              position: absolute;
              inset: 0;
              clip-path: ${HEXAGON_CLIP_PATH};
              box-shadow: inset 0 0 0 3px ${euiTheme.colors.darkestShade};
              pointer-events: none;
            `}
          />
        )}
      </button>
    </EuiToolTip>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

interface NodeTextProps {
  children: React.ReactNode;
  color: string;
  fontSize: string;
  bold?: boolean;
}

const NodeText: React.FC<NodeTextProps> = ({ children, color, fontSize, bold }) => (
  <div
    css={css`
      text-align: center;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 0 0 auto;
      color: ${color};
      font-size: ${fontSize};
      font-weight: ${bold ? 700 : 400};
      line-height: 1.3;
    `}
  >
    {children}
  </div>
);
