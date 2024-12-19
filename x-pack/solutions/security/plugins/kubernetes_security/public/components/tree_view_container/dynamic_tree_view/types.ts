/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KeyboardEventHandler } from 'react';
import { QueryDslQueryContainerBool, KubernetesCollectionMap, DynamicTree } from '../../../types';

export type DynamicTreeViewProps = {
  tree: DynamicTree[];
  depth?: number;
  selectionDepth?: Partial<KubernetesCollectionMap>;
  query: QueryDslQueryContainerBool;
  onSelect: (
    selectionDepth: Partial<KubernetesCollectionMap>,
    type: string,
    key: string | number,
    clusterName?: string
  ) => void;
  hasSelection?: boolean;
  selected?: string;
  expanded?: boolean;
  onKeyDown?: KeyboardEventHandler | undefined;
};

export type DynamicTreeViewItemProps = Required<
  Omit<DynamicTreeViewProps, 'hasSelection' | 'onKeyDown'>
> & {
  onToggleExpand: any;
  aggData: any;
  isExpanded: boolean;
};
