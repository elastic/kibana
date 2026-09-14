/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { NodeProps } from '../types';
import { EntityCardNode } from './entity_card_node';

/** Rectangle entity node — delegates to the shared EntityCardNode card layout. */
export const RectangleNode = memo<NodeProps>((props: NodeProps) => <EntityCardNode {...props} />);

RectangleNode.displayName = 'RectangleNode';
