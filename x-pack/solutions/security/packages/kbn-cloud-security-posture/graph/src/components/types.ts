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

export interface EntityNodeViewModel
  extends Record<string, unknown>,
    EntityNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: ExpandButtonClickCallback;
  nodeClick?: NodeClickCallback;
  ipClickHandler?: IpClickCallback;
  countryClickHandler?: CountryClickCallback;
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
    BaseNodeDataViewModel {}

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
    }
  >
>;
