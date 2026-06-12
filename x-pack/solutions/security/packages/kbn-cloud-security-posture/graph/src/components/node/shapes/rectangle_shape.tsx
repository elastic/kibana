/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { HoverShapeProps, ShapeProps } from './types';

export const RectangleHoverShape = memo<HoverShapeProps>(({ stroke }) => (
  <rect
    opacity="0.5"
    x="1"
    y="0.5"
    width="79"
    height="79"
    rx="7.5"
    stroke={stroke}
    strokeDasharray="2 2"
  />
));
RectangleHoverShape.displayName = 'RectangleHoverShape';

export const RectangleShape = memo<ShapeProps>(({ stroke, fill, ...rest }) => (
  <rect x="1" y="0.5" width="63" height="63" rx="7.5" fill={fill} stroke={stroke} {...rest} />
));
RectangleShape.displayName = 'RectangleShape';
