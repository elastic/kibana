/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { EntityIcon } from './entity_icon';
import type { EntityNodeViewModel } from '../../types';
import { GRAPH_ENTITY_NODE_SIMPLIFIED_ID } from '../../test_ids';

export interface EntityNodeSimplifiedProps {
  data: EntityNodeViewModel;
}

export const EntityNodeSimplified = ({ data }: EntityNodeSimplifiedProps) => {
  const { icon, color = 'primary', count, label, id } = data;

  return (
    <div
      data-test-subj={GRAPH_ENTITY_NODE_SIMPLIFIED_ID}
      // Flex (not the default inline flow) so the tile has no baseline/line-height
      // gap below it — this keeps the content box exactly the tile's size so the
      // absolutely-centered expand button lands on the tile's true vertical center.
      css={css`
        display: flex;
      `}
    >
      {/* display="block" so the tooltip anchor is block-level and adds no inline
          baseline gap below the 40px icon (which would otherwise push the content
          box taller and misalign the vertically-centered expand button). */}
      <EuiToolTip content={label ?? id} position="top" display="block">
        <EntityIcon icon={icon} color={color} count={count} />
      </EuiToolTip>
    </div>
  );
};

EntityNodeSimplified.displayName = 'EntityNodeSimplified';
