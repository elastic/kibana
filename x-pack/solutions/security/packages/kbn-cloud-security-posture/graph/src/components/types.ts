/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type {
  EntityNodeDataModel,
  GroupNodeDataModel,
  LabelNodeDataModel,
  RelationshipNodeDataModel,
  EdgeDataModel,
  NodeShape,
  NodeColor,
  NodeDocumentDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { Node, NodeProps as xyNodeProps, Edge, EdgeProps as xyEdgeProps } from '@xyflow/react';

export interface Size {
  width: number;
  height: number;
}

interface BaseNodeDataViewModel {
  interactive?: boolean;
  /** When true, render a dashed outline around the node. */
  highlightAsOrigin?: boolean;
}

export type NodeClickCallback = (e: React.MouseEvent<HTMLElement>, node: NodeProps) => void;

export type ExpandButtonClickCallback = (
  e: React.MouseEvent<HTMLElement>,
  node: NodeProps,
  unToggleCallback: () => void
) => void;

export type IpClickCallback = (e: React.MouseEvent<HTMLElement>) => void;

export type CountryClickCallback = (e: React.MouseEvent<HTMLElement>) => void;

export type EventClickCallback = (e: React.MouseEvent<HTMLButtonElement>) => void;

/** Icon action used by the entity expand popover and hover toolbar. */
export interface EntityActionItem {
  type: 'item';
  iconType: string;
  label: string;
  onClick: () => void;
  testSubject: string;
  disabled?: boolean;
}

export interface EntityNodeViewModel
  extends Record<string, unknown>,
    EntityNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: ExpandButtonClickCallback;
  nodeClick?: NodeClickCallback;
  ipClickHandler?: IpClickCallback;
  countryClickHandler?: CountryClickCallback;
  showEntityId?: boolean;
  /**
   * How entity actions popover is opened.
   * - `button`: show `⋯` and open on click
   * - `hover` (Test A): hide `⋯` and open on card hover
   */
  entityActionsMode?: 'button' | 'hover';
  /**
   * Entity visual style for prototyping (dev-graph).
   * - `default`: neutral header/icon
   * - `colored`: variant 2D — plain header, risk-light icon, solid risk badge
   */
  entityStyleMode?: 'default' | 'colored';
  /**
   * Shared fixed width for all entity cards in the current graph
   * (sized from the longest entity label).
   */
  cardWidth?: number;
  /** Closes the entity actions popover (used by hover mode cleanup). */
  closeEntityActions?: () => void;
  /**
   * Returns the same expand-action items as the `⋯` popover.
   * Used by hover mode to render the toolbar above the entity.
   */
  getEntityActionItems?: () => EntityActionItem[];
}

export interface GroupNodeViewModel
  extends Record<string, unknown>,
    GroupNodeDataModel,
    BaseNodeDataViewModel {}

export type NodeDocumentDataViewModel = NodeDocumentDataModel;

export interface LabelNodeViewModel
  extends Record<string, unknown>,
    LabelNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: ExpandButtonClickCallback;
  nodeClick?: NodeClickCallback;
  ipClickHandler?: IpClickCallback;
  countryClickHandler?: CountryClickCallback;
  eventClickHandler?: EventClickCallback;
}

export interface RelationshipNodeViewModel
  extends Record<string, unknown>,
    RelationshipNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: ExpandButtonClickCallback;
}

export type NodeViewModel =
  | EntityNodeViewModel
  | GroupNodeViewModel
  | LabelNodeViewModel
  | RelationshipNodeViewModel;

export type NodeProps = xyNodeProps<Node<NodeViewModel>>;

export interface EdgeViewModel extends Record<string, unknown>, EdgeDataModel {}

export type EdgeProps = xyEdgeProps<
  Edge<
    EdgeViewModel & {
      sourceShape: NodeShape;
      sourceColor: NodeColor;
      targetShape: NodeShape;
      targetColor: NodeColor;
      isOriginHighlightEdge?: boolean;
    }
  >
>;
