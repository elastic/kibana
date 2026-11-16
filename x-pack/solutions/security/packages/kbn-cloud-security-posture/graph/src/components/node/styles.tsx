/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import styled from '@emotion/styled';
import {
  type EuiThemeComputed,
  type EuiTextProps,
  type CommonProps,
  EuiButtonIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EventNodeViewModel } from '..';
import { GRAPH_ENTITY_NODE_BUTTON_ID } from '../test_ids';

/**
 * The total height Dagre reserves per entity node in the layout, set to the
 * fully-expanded card height (header + all metadata rows visible + hover actions).
 * Pre-reserving this space prevents nodes from overlapping their neighbours.
 *
 * Calculation (worst-case: grouped node, 5 metadata rows):
 *   60px (header) + 1px (metadata border-top) + 5 × 56px (rows) = 341px → 360px (snapped to GRID_SIZE×2=20).
 *
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const ENTITY_NODE_TOTAL_HEIGHT = 360;

/**
 * The width of an entity card node in the graph, in pixels.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const NODE_WIDTH = 300;

/**
 * The visual height of the entity card node body (header + metadata rows).
 * Used to anchor the node's Y position in the Dagre layout:
 *   entity_node_top = dagreNode.y − NODE_HEIGHT / 2
 * so the card's visual centre aligns with the Dagre Y, which is where
 * relationship/event nodes are placed by the layout algorithm.
 * Approximate actual rendered height ranges from ~196 px (single entity, 2 metadata rows)
 * to ~223 px (grouped entity with multiple criticality levels). With justify-content: center
 * on NodeShapeContainer, any card from ~196–223 px is centred so its visual midpoint lands
 * at exactly NODE_HEIGHT / 2 = 120 px — matching the handle and connector node positions.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const NODE_HEIGHT = 240;

/**
 * The height of the entity card's fixed header row (icon | name+tag | risk badge), in pixels.
 * Used for all visual 60px elements: header, stacked card decoration, expand button centering.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const ENTITY_CARD_HEADER_HEIGHT = 60;

/**
 * The width of a node label in the graph, in pixels.
 * 220px = 200px baseline + ~20px to compensate for the badge (icon + gap) on the left.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const NODE_LABEL_WIDTH = 220;

/**
 * The width of the identity label rendered below an entity node, in pixels.
 * Narrower than `NODE_LABEL_WIDTH` to limit overflow past the entity shape.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const ENTITY_NODE_LABEL_WIDTH = 160;

/**
 * The total height of a event node including the shape and details below, in pixels.
 * Required in layout_graph.ts
 */
export const NODE_LABEL_TOTAL_HEIGHT = 72;

/**
 * The height of a node label in the graph, in pixels.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const NODE_LABEL_HEIGHT = 20;

/**
 * The height of the details below a event node shape, in pixels.
 * Required in layout_graph.ts
 */
export const NODE_LABEL_DETAILS = NODE_LABEL_TOTAL_HEIGHT - NODE_LABEL_HEIGHT;

export const LABEL_BORDER_WIDTH = 1;
export const ACTUAL_LABEL_HEIGHT = 24 + LABEL_BORDER_WIDTH * 2;
export const LABEL_PADDING_X = 8;

export const LABEL_BORDER_RADIUS = 9999;

export const EventNodeContainer = styled.div`
  position: relative;
  top: ${(NODE_LABEL_HEIGHT - ACTUAL_LABEL_HEIGHT) / 2}px;
  text-wrap: nowrap;
  width: ${NODE_LABEL_WIDTH}px;
  max-width: ${NODE_LABEL_WIDTH}px;
  height: ${ACTUAL_LABEL_HEIGHT}px;
`;

interface LabelShapeProps extends EuiTextProps {
  backgroundColor?: string;
  borderColor?: string;
  shadow?: string;
}

const HOVER_BORDER_COLOR = '#1750BA';

export const LabelShape = styled(EuiText, {
  shouldForwardProp(propName) {
    return !['backgroundColor', 'borderColor', 'isConnectable', 'shadow'].includes(propName);
  },
})<LabelShapeProps>`
  background-color: ${(props) => props.backgroundColor};
  border: ${(props) => `${LABEL_BORDER_WIDTH}px solid ${props.borderColor}`};
  max-width: ${NODE_LABEL_WIDTH - LABEL_PADDING_X * 2 - LABEL_BORDER_WIDTH * 2}px;
  max-height: ${NODE_LABEL_HEIGHT - LABEL_BORDER_WIDTH * 2}px;

  line-height: 1.5;
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 6px ${LABEL_PADDING_X}px;
  border-radius: ${LABEL_BORDER_RADIUS}px;
  min-height: 100%;
  min-width: 100%;
  transition: border-color 0.2s ease;

  /* Change border colour on hover/focus for interactive nodes */
  .react-flow__node:not(.non-interactive) ${EventNodeContainer}:hover & {
    border-color: ${HOVER_BORDER_COLOR};
  }

  .react-flow__node:not(.non-interactive):focus:focus-visible & {
    border-color: ${HOVER_BORDER_COLOR};
  }

  /* Retain blue border when node is selected (click-to-select, one at a time) */
  .react-flow__node:not(.non-interactive).selected & {
    border-color: ${HOVER_BORDER_COLOR};
  }

  ${({ shadow }) => `
    /* Apply shadow when node is selected (only for interactive nodes) */
    .react-flow__node:not(.non-interactive).selected & {
      ${shadow};
    }

    /* Apply shadow when node is pressed but still not selected (only for interactive nodes) */
    .react-flow__node:not(.non-interactive):active:not(.selected) & {
      ${shadow};
    }

    /* After dragging node, it'll remain selected so shadow is visible until clicked outside */
  `};
`;

export const LabelStackedShape = styled.div<{ borderColor: string; backgroundColor: string }>`
  position: absolute;
  width: 100%;
  height: 100%;
  transform: scale(0.9) translateY(calc(-100% + 3px));
  z-index: -1;
  background-color: ${(props) => props.backgroundColor};
  border: ${(props) => `${LABEL_BORDER_WIDTH}px solid ${props.borderColor}`};
  border-radius: ${LABEL_BORDER_RADIUS}px;
`;

export const NodeContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: ${NODE_WIDTH}px;
`;

/**
 * Gets the background, border and text colors for event nodes based on color prop
 */
export const getLabelColors = (
  color: EventNodeViewModel['color'],
  euiTheme: EuiThemeComputed
): { backgroundColor: string; borderColor: string; textColor: string } => {
  if (color === 'danger') {
    return {
      backgroundColor: euiTheme.colors.backgroundLightPrimary,
      borderColor: euiTheme.colors.borderBasePlain,
      textColor: euiTheme.colors.textHeading,
    };
  }

  return {
    backgroundColor: euiTheme.colors.backgroundLightPrimary,
    borderColor: euiTheme.colors.borderBasePlain,
    textColor: euiTheme.colors.textHeading,
  };
};

/**
 * Gets the background, border and text colors for relationship nodes.
 * Uses the same colors as event nodes for visual consistency.
 */
export const getRelationshipColors = (
  euiTheme: EuiThemeComputed
): { backgroundColor: string; borderColor: string; textColor: string } => {
  return {
    backgroundColor: euiTheme.colors.backgroundLightPrimary,
    borderColor: euiTheme.colors.borderBasePlain,
    textColor: euiTheme.colors.textHeading,
  };
};

export const NodeShapeContainer = styled.div`
  position: relative;
  width: ${NODE_WIDTH}px;
  height: ${NODE_HEIGHT}px;
`;

interface ButtonContainerProps extends CommonProps {
  width?: number;
  height?: number;
}

export interface NodeButtonProps extends ButtonContainerProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export const NodeButton = ({ onClick, width, height, ...props }: NodeButtonProps) => (
  <StyledNodeContainer width={width} height={height} {...props}>
    <StyledNodeButton
      width={width}
      height={height}
      onClick={onClick}
      data-test-subj={GRAPH_ENTITY_NODE_BUTTON_ID}
    />
  </StyledNodeContainer>
);

const StyledNodeContainer = styled.div<ButtonContainerProps>`
  position: absolute;
  width: ${(props) => props.width ?? NODE_WIDTH}px;
  height: ${(props) => props.height ?? NODE_HEIGHT}px;
  z-index: 1;
`;

const StyledNodeButton = styled.button<NodeButtonProps>`
  appearance: none;
  width: ${(props) => props.width ?? NODE_WIDTH}px;
  height: ${(props) => props.height ?? NODE_HEIGHT}px;
`;

interface NodeExpandButtonContainerProps extends CommonProps {
  x?: string;
  y?: string;
}

export const NodeExpandButtonContainer = styled.div<NodeExpandButtonContainerProps>`
  appearance: none;
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */
  ${({ x, y }: NodeExpandButtonContainerProps) =>
    (x || y) && `transform: translate(${x ?? '0'}, ${y ?? '0'});`}
  position: absolute;
  z-index: 1;

  &.toggled {
    opacity: 1;
  }

  /* Only show hover effects for interactive nodes */
  .react-flow__node:not(.non-interactive) ${NodeShapeContainer}:hover &,
  .react-flow__node:not(.non-interactive) ${EventNodeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }

  &:has(button:focus) {
    opacity: 1; /* Show when button is active */
  }

  .react-flow__node:not(.non-interactive):focus:focus-visible & {
    opacity: 1; /* Show on node focus */
  }
`;

export const ExpandButtonSize = 18;

export const RoundEuiButtonIcon = styled(EuiButtonIcon, {
  shouldForwardProp: (propName) => propName !== 'backgroundColor',
})<{ backgroundColor: string }>`
  border-radius: 50%;
  background-color: ${(props) => props.backgroundColor};
  width: ${ExpandButtonSize}px;
  height: ${ExpandButtonSize}px;

  > svg {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  :hover,
  :focus,
  :active {
    background-color: ${(props) => props.backgroundColor};
  }
`;

export const HandleStyleOverride: React.CSSProperties = {
  background: 'none',
  border: 'none',
};

export const getStackNodeStyle = (size: {
  width: number;
  height: number;
}): React.CSSProperties => ({
  backgroundColor: 'transparent',
  padding: 0,
  border: '0px solid',
  boxShadow: 'none',
  width: size.width,
  height: size.height,
});

interface RoundedBadgeProps extends PropsWithChildren {
  bgColor?: string;
  'data-test-subj'?: string;
}

const ThemedRoundedBadge = styled.div<{
  euiTheme: EuiThemeComputed;
  bgColor?: string;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  height: 20px;
  min-width: 20px;
  padding: ${({ euiTheme }) => `${euiTheme.size.xxs} ${euiTheme.size.xs}`};
  gap: ${({ euiTheme }) => euiTheme.size.xxs};

  background-color: ${({ euiTheme, bgColor }) => bgColor || euiTheme.colors.backgroundBasePlain};
  border: ${({ euiTheme }) =>
    `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`};
  border-radius: 9999px;

  font-weight: ${({ euiTheme }) => euiTheme.font.weight.bold};
`;

export const RoundedBadge = ({
  bgColor,
  'data-test-subj': dataTestSubj,
  children,
}: RoundedBadgeProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <ThemedRoundedBadge euiTheme={euiTheme} bgColor={bgColor} data-test-subj={dataTestSubj}>
      {children}
    </ThemedRoundedBadge>
  );
};
