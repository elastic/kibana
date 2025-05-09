/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationNode } from './operation_node';

export class InternalNode {
  name: string;
  description: string;
  children: Array<OperationNode | InternalNode>;
  constructor({
    name,
    description,
    children,
  }: {
    name: string;
    description: string;
    children: Array<OperationNode | InternalNode>;
  }) {
    this.name = name;
    this.description = description;
    this.children = children;
  }
}
