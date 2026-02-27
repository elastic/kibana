/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { HoverShapeProps, ShapeProps } from './types';

export const EllipseHoverShape = memo<HoverShapeProps>(({ stroke }) => (
  <circle opacity="0.5" cx="45" cy="45" r="44.5" stroke={stroke} strokeDasharray="2 2" />
));
EllipseHoverShape.displayName = 'EllipseHoverShape';

export const EllipseShape = memo<ShapeProps>(({ stroke, fill, ...rest }) => (
  <circle cx="36" cy="36" r="35.5" fill={fill} stroke={stroke} {...rest} />
));
EllipseShape.displayName = 'EllipseShape';
