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
  type EuiIconProps,
  type EuiTextProps,
  type CommonProps,
  EuiButtonIcon,
  EuiIcon,
  EuiText,
  useEuiBackgroundColor,
  useEuiTheme,
  transparentize,
} from '@elastic/eui';
import { rgba } from 'polished';
import { css } from '@emotion/react';
import { getSpanIcon } from './get_span_icon';
import type { EntityNodeViewModel, LabelNodeViewModel } from '..';
import { GRAPH_ENTITY_NODE_BUTTON_ID } from '../test_ids';

/**
 * The width of the redesigned entity node card, in pixels. Used both to render
 * the card and to size the node in layout_graph.ts so neighbouring nodes and
 * relationship connectors are spaced to fit the full-detail card without
 * overlap. Must be a multiple of `GRID_SIZE * 2`.
 */
export const ENTITY_NODE_WIDTH = 300;

/**
 * The total height reserved for an entity node in the layout, in pixels. Sized to
 * the tallest (grouped, full-metadata) detailed card so cards never overlap
 * vertically. Required to calculate total node's height in layout_graph.ts.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const ENTITY_NODE_TOTAL_HEIGHT = 320;

/**
 * The size (width and height) of the entity node in simplified (zoomed-out) mode.
 * When the graph switches to simplified, Dagre re-runs with this footprint so
 * edges connect directly to the tile edge with no gap.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const ENTITY_NODE_SIMPLIFIED_SIZE = 40;

/**
 * The width of a node in the graph, in pixels.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const NODE_WIDTH = 100;

/**
 * The height of a node in the graph, in pixels.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const NODE_HEIGHT = 100;

/**
 * The width of a node label in the graph, in pixels.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const NODE_LABEL_WIDTH = 200;

/**
 * The width of the identity label rendered below an entity node, in pixels.
 * Narrower than `NODE_LABEL_WIDTH` to limit overflow past the entity shape.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const ENTITY_NODE_LABEL_WIDTH = 160;

/**
 * The total height of a label node including the shape and details below, in pixels.
 * Required in layout_graph.ts
 */
export const NODE_LABEL_TOTAL_HEIGHT = 72;

/**
 * The height of a node label in the graph, in pixels.
 * Must be a multiple of `GRID_SIZE * 2`.
 */
export const NODE_LABEL_HEIGHT = 20;

/**
 * The height of the details below a label node shape, in pixels.
 * Required in layout_graph.ts
 */
export const NODE_LABEL_DETAILS = NODE_LABEL_TOTAL_HEIGHT - NODE_LABEL_HEIGHT;

export const LABEL_BORDER_WIDTH = 1;
export const ACTUAL_LABEL_HEIGHT = 24 + LABEL_BORDER_WIDTH * 2;
export const LABEL_PADDING_X = 8;

const LABEL_BORDER_RADIUS = 8;

type NodeColor = EntityNodeViewModel['color'] | LabelNodeViewModel['color'];

export const LabelNodeContainer = styled.div`
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

export const LabelStackedShape = styled.div<{ borderColor: string }>`
  position: absolute;
  width: 100%;
  height: 100%;
  transform: scale(0.9) translateY(calc(-100% + 3px));
  z-index: -1;
  border: ${(props) => `${LABEL_BORDER_WIDTH}px solid ${props.borderColor}`};
  border-radius: ${LABEL_BORDER_RADIUS}px;
`;

export const LabelShapeOnHover = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */
  border: ${(props) => {
    const { euiTheme } = useEuiTheme();
    return `dashed ${rgba(
      euiTheme.colors[props.color as keyof typeof euiTheme.colors] as string,
      0.5
    )} 1px`;
  }};
  border-radius: ${LABEL_BORDER_RADIUS}px;
  background: transparent;
  width: calc(100% + 12px);
  height: calc(100% + 12px);

  /* Only show hover effects for interactive nodes */
  .react-flow__node:not(.non-interactive) ${LabelNodeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }

  .react-flow__node:not(.non-interactive):focus:focus-visible & {
    opacity: 1; /* Show on focus */
  }
`;

export const NodeContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: ${NODE_WIDTH}px;
`;

interface EntityNodeContainerProps {
  isSimplified?: boolean;
}

/**
 * Root container for the redesigned EntityNode. Its dimensions match the Dagre
 * layout footprint for the current detail level:
 *   - detailed: `ENTITY_NODE_WIDTH` × `ENTITY_NODE_TOTAL_HEIGHT` (300×320)
 *   - simplified: `ENTITY_NODE_SIMPLIFIED_SIZE` × `ENTITY_NODE_SIMPLIFIED_SIZE` (40×40)
 *
 * Centering keeps the rendered content's visual center on the Dagre centerline so
 * connector nodes line up horizontally and vertically in both detail levels.
 *
 * Referenced by NodeExpandButtonContainer's hover selectors so the expand button
 * reveals on hover.
 */
export const EntityNodeContainer = styled('div', {
  shouldForwardProp: (propName) => propName !== 'isSimplified',
})<EntityNodeContainerProps>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ isSimplified }) =>
    isSimplified ? `${ENTITY_NODE_SIMPLIFIED_SIZE}px` : `${ENTITY_NODE_WIDTH}px`};
  height: ${({ isSimplified }) =>
    isSimplified ? `${ENTITY_NODE_SIMPLIFIED_SIZE}px` : `${ENTITY_NODE_TOTAL_HEIGHT}px`};
`;

/**
 * Inner wrapper that shrinks to the rendered content (detailed card or simplified
 * tile). It is the positioning context for the expand button, click overlay, and
 * connection handles, so they track the actual visible element in both detail
 * levels while the outer EntityNodeContainer keeps everything centered.
 */
export const EntityNodeContent = styled.div`
  position: relative;
  display: inline-flex;
`;

/**
 * Positions the expand ("+") button centered on the right edge of the entity
 * content. Uses a z-index above the full-size click overlay (`StyledNodeContainer`,
 * z-index 1) so the button stays clickable — this matters most in the simplified
 * (small tile) view, where the overlay and button nearly coincide.
 */
export const EntityNodeExpandButtonWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translate(-50%, -50%);
  z-index: 2;
`;

/**
 * Gets the background, border and text colors for label nodes based on color prop
 */
export const getLabelColors = (
  color: LabelNodeViewModel['color'],
  euiTheme: EuiThemeComputed
): { backgroundColor: string; borderColor: string; textColor: string } => {
  if (color === 'danger') {
    return {
      backgroundColor: euiTheme.colors.danger,
      borderColor: euiTheme.colors.danger,
      textColor: euiTheme.colors.textInverse,
    };
  }

  return {
    backgroundColor: euiTheme.colors.backgroundBasePrimary,
    borderColor: euiTheme.colors.borderStrongPrimary,
    textColor: euiTheme.colors.textPrimary,
  };
};

/**
 * Gets the background, border and text colors for relationship nodes
 * Relationship nodes have fixed colors (dark background with light text)
 */
export const getRelationshipColors = (
  euiTheme: EuiThemeComputed
): { backgroundColor: string; borderColor: string; textColor: string } => {
  return {
    backgroundColor: euiTheme.colors.backgroundLightText,
    borderColor: euiTheme.colors.borderBaseProminent,
    textColor: euiTheme.colors.textParagraph,
  };
};

export const NodeShapeContainer = styled.div`
  position: relative;
  width: ${NODE_WIDTH}px;
  height: ${NODE_HEIGHT}px;
`;

export const NodeShapeSvg = styled.svg<{ shadow?: string; yPosDelta?: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;

  ${({ yPosDelta }) => {
    const delta = typeof yPosDelta === 'number' ? yPosDelta : 0;
    return `transform: translate(-50%, calc(-50% + ${delta}px));`;
  }}

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

interface ButtonContainerProps extends CommonProps {
  width?: number;
  height?: number;
}

export interface NodeButtonProps extends ButtonContainerProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  style?: React.CSSProperties;
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
  .react-flow__node:not(.non-interactive) ${LabelNodeContainer}:hover &,
  .react-flow__node:not(.non-interactive) ${EntityNodeContent}:hover & {
    opacity: 1; /* Show on hover */
  }

  &:has(button:focus) {
    opacity: 1; /* Show when button is active */
  }

  .react-flow__node:not(.non-interactive):focus:focus-visible & {
    opacity: 1; /* Show on node focus */
  }
`;

export const NodeShapeOnHoverSvg = styled(NodeShapeSvg)`
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */

  /* Only show hover effects for interactive nodes */
  .react-flow__node:not(.non-interactive) ${NodeShapeContainer}:hover &,
  .react-flow__node:not(.non-interactive) ${LabelNodeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }

  .react-flow__node:not(.non-interactive)
    ${NodeShapeContainer}:has(${NodeExpandButtonContainer}.toggled)
    &,
  .react-flow__node:not(.non-interactive)
    ${LabelNodeContainer}:has(${NodeExpandButtonContainer}.toggled)
    & {
    opacity: 1; /* Show when expand button is toggled */
  }

  .react-flow__node:not(.non-interactive):focus:focus-visible & {
    opacity: 1; /* Show on focus */
  }
`;

interface NodeIconProps {
  icon: string;
  color?: EuiIconProps['color'];
  x: string;
  y: string;
}

export const NodeIcon = ({ icon, color, x, y }: NodeIconProps) => {
  return (
    <foreignObject x={x} y={y} width="50" height="50">
      <div
        css={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
      >
        <EuiIcon
          type={getSpanIcon(icon) ?? icon}
          size="l"
          color={color ?? 'primary'}
          aria-hidden={true}
        />
      </div>
    </foreignObject>
  );
};

export const ExpandButtonSize = 18;

/** Larger hit area for the filled (entity node) expand button, per the 9.5 design. */
export const FilledExpandButtonSize = 28;

export const RoundEuiButtonIcon = styled(EuiButtonIcon, {
  shouldForwardProp: (propName) => propName !== 'backgroundColor' && propName !== 'filled',
})<{ backgroundColor?: string; filled?: boolean }>`
  border-radius: 50%;
  width: ${({ filled }) => (filled ? FilledExpandButtonSize : ExpandButtonSize)}px;
  height: ${({ filled }) => (filled ? FilledExpandButtonSize : ExpandButtonSize)}px;

  /* Only force a background when one is provided (outline style). When omitted or
     transparent, EUI's display="fill" provides its own (e.g. blue) background. */
  ${({ backgroundColor }) =>
    backgroundColor && backgroundColor !== 'transparent'
      ? `background-color: ${backgroundColor};
         :hover, :focus, :active { background-color: ${backgroundColor}; }`
      : ''}

  > svg {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    ${({ filled }) => (filled ? `width: 18px; height: 18px;` : '')}
  }
`;

export const HandleStyleOverride: React.CSSProperties = {
  background: 'none',
  border: 'none',
};

export const useNodeFillColor = (color: NodeColor | undefined) => {
  const fillColor = (color === 'danger' ? 'primary' : color) ?? 'primary';
  return useEuiBackgroundColor(fillColor);
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
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.small};

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

export const ToolTipButton = (props: PropsWithChildren) => {
  const { euiTheme } = useEuiTheme();
  return (
    <button
      {...props}
      css={css`
        appearance: none; /* Reset native button styles provided by browsers */

        &:focus {
          /* Tooltip injects its own outline that uses "currentColor" so we style it setting "color" */
          color: ${euiTheme.colors.primary};
        }
      `}
      type="button"
    />
  );
};

export const middleEntityNodeShapeStyle = (strokeColor: string) => {
  return {
    transform: 'scale(0.9) translateY(7px)',
    transformOrigin: 'center',
    stroke: transparentize(strokeColor, 0.5),
  };
};

export const bottomEntityNodeShapeStyle = (strokeColor: string) => {
  return {
    transform: 'scale(0.8) translateY(16px)',
    transformOrigin: 'center',
    stroke: transparentize(strokeColor, 0.3),
  };
};
