/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  EntityNodeDataModel,
  GroupNodeDataModel,
  LabelNodeDataModel,
  EdgeDataModel,
  NodeShape,
  Color as NodeColor,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import type {
  Node,
  NodeProps as xyNodeProps,
  Edge,
  EdgeProps as xyEdgeProps,
  PanelPosition,
  XYPosition,
} from '@xyflow/react';

export interface Size {
  width: number;
  height: number;
}

interface BaseNodeDataViewModel {
  interactive?: boolean;
}

export type NodeClickCallback = (e: React.MouseEvent<HTMLElement>, node: NodeProps) => void;

export type ExpandButtonClickCallback = (
  e: React.MouseEvent<HTMLElement>,
  node: NodeProps,
  unToggleCallback: () => void
) => void;

export interface EntityNodeViewModel
  extends Record<string, unknown>,
    EntityNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: ExpandButtonClickCallback;
  nodeClick?: NodeClickCallback;
}

export interface GroupNodeViewModel
  extends Record<string, unknown>,
    GroupNodeDataModel,
    BaseNodeDataViewModel {}

export interface LabelNodeViewModel
  extends Record<string, unknown>,
    LabelNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: ExpandButtonClickCallback;
  nodeClick?: NodeClickCallback;
}

export type NodeViewModel = EntityNodeViewModel | GroupNodeViewModel | LabelNodeViewModel;

export type NodeProps = xyNodeProps<Node<NodeViewModel>>;

export interface EdgeViewModel extends Record<string, unknown>, EdgeDataModel {}

export type EdgeProps = xyEdgeProps<
  Edge<
    EdgeViewModel & {
      sourceShape: NodeShape;
      sourceColor: NodeColor;
      targetShape: NodeShape;
      targetColor: NodeColor;
      edgeBorderRadius?: number;
    }
  >
>;

/**
 * Props for the minimap component in the graph
 */
export interface MinimapProps {
  /**
   * Determines whether panning is enabled in the minimap
   */
  pannable?: boolean;
  /**
   * Determines whether zooming is enabled in the minimap
   */
  zoomable?: boolean;
  /**
   * Callback function called when minimap is clicked.
   */
  onClick?: (event: React.MouseEvent<Element, MouseEvent>, position: XYPosition) => void;
  /**
   * Color for nodes in the minimap
   */
  nodeColor?: string;
  /**
   * Stroke color for nodes in the minimap
   */
  nodeStrokeColor?: string;
  /**
   * Custom CSS class name for nodes in the minimap
   */
  nodeClassName?: string;
  /**
   * Border radius for nodes in the minimap (in pixels)
   */
  nodeBorderRadius?: number;
  /**
   * Stroke width for nodes in the minimap (in pixels)
   */
  nodeStrokeWidth?: number;
  /**
   * Background color of the minimap
   */
  bgColor?: string;
  /**
   * Color for the mask overlay in the minimap (RGBA format recommended)
   */
  maskColor?: string;
  /**
   * Stroke color for the mask in the minimap
   */
  maskStrokeColor?: string;
  /**
   * Stroke width for the mask in the minimap (in pixels)
   */
  maskStrokeWidth?: number;
  /**
   * Position of the minimap panel
   */
  position?: PanelPosition;
  /**
   * Accessibility label for the minimap
   */
  ariaLabel?: string;
  /**
   * Inverts panning direction when set to true
   */
  inversePan?: boolean;
  /**
   * Step size for zooming in the minimap
   */
  zoomStep?: number;
  /**
   * Scale offset for the minimap
   */
  offsetScale?: number;
}
