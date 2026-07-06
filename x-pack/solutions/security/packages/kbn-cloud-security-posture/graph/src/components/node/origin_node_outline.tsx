/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { GRAPH_ORIGIN_NODE_OUTLINE_ID } from '../test_ids';

/** Space between the node border and the origin highlight outline. */
export const ORIGIN_NODE_OUTLINE_OFFSET = 6;

/** Dashed origin highlight stroke width. */
export const ORIGIN_NODE_OUTLINE_BORDER_WIDTH = 2;

/** Outline radius for full-size entity cards. */
export const ORIGIN_ENTITY_OUTLINE_BORDER_RADIUS = 16;

/** Outline radius for simplified (zoomed-out) entity icon boxes. */
export const ORIGIN_ENTITY_SIMPLIFIED_OUTLINE_BORDER_RADIUS = 12;

export interface OriginNodeOutlineProps {
  borderColor: string;
  borderRadius: number | string;
  borderWidth?: number;
}

export const OriginNodeOutline = ({
  borderColor,
  borderRadius,
  borderWidth = ORIGIN_NODE_OUTLINE_BORDER_WIDTH,
}: OriginNodeOutlineProps) => (
  <div
    data-test-subj={GRAPH_ORIGIN_NODE_OUTLINE_ID}
    css={css`
      position: absolute;
      inset: -${ORIGIN_NODE_OUTLINE_OFFSET}px;
      border: ${borderWidth}px dashed ${borderColor};
      border-radius: ${typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius};
      pointer-events: none;
    `}
  />
);
