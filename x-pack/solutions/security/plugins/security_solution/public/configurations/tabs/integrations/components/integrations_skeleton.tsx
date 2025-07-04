/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiSkeletonRectangle, EuiSpacer } from '@elastic/eui';
import { FACETS_MAX_WIDTH_PX, INTEGRATIONS_GRID_MAX_WIDTH_PX } from './constants';

const FACET_LOADING_WIDTH = '216px';
const FACET_LOADING_HEIGHT = '20px';

const SEARCH_BAR_LOADING_WIDTH = '872px';
const SEARCH_BAR_LOADING_HEIGHT = '40px';

const CARD_LOADING_WIDTH = '279px';
const CARD_LOADING_HEIGHT = '88px';

export const IntegrationsSkeleton: React.FC = () => (
  <>
    <EuiFlexGroup>
      <EuiFlexGroup
        css={css`
          max-width: ${FACETS_MAX_WIDTH_PX}px;
        `}
        direction="column"
        gutterSize="none"
      >
        <EuiSpacer size="l" />
        <EuiSkeletonRectangle width={FACET_LOADING_WIDTH} height={FACET_LOADING_HEIGHT} />
        <EuiSpacer size="m" />
        <EuiSkeletonRectangle width={FACET_LOADING_WIDTH} height={FACET_LOADING_HEIGHT} />
      </EuiFlexGroup>
      <EuiFlexGroup
        css={css`
          max-width: ${INTEGRATIONS_GRID_MAX_WIDTH_PX}px;
        `}
        direction="column"
        gutterSize="none"
      >
        <EuiSpacer size="l" />
        <EuiSkeletonRectangle width={SEARCH_BAR_LOADING_WIDTH} height={SEARCH_BAR_LOADING_HEIGHT} />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m">
          <EuiSkeletonRectangle width={CARD_LOADING_WIDTH} height={CARD_LOADING_HEIGHT} />
          <EuiSkeletonRectangle width={CARD_LOADING_WIDTH} height={CARD_LOADING_HEIGHT} />
          <EuiSkeletonRectangle width={CARD_LOADING_WIDTH} height={CARD_LOADING_HEIGHT} />
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m">
          <EuiSkeletonRectangle width={CARD_LOADING_WIDTH} height={CARD_LOADING_HEIGHT} />
          <EuiSkeletonRectangle width={CARD_LOADING_WIDTH} height={CARD_LOADING_HEIGHT} />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiFlexGroup>
  </>
);
