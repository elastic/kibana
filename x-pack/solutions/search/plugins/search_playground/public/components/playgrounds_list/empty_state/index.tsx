/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiImage } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { PLUGIN_NAME } from '../../../../common';
import { useAssetBasePath } from '../../../hooks/use_asset_base_path';

import { PlaygroundsListEmptyStateBody } from './body';
import { EmptyStateFooter } from './footer';
import type { PlaygroundsListEmptyStateProps } from './types';

// Override styling for empty state to allow it to grow wider for content we provide
const EmptyStateStyle = css`
  min-inline-size: 64rem;
  .euiEmptyPrompt__content {
    max-inline-size: 60em;
  }
`;

export const PlaygroundsListEmptyState = (props: PlaygroundsListEmptyStateProps) => {
  const assetBasePath = useAssetBasePath();

  return (
    <KibanaPageTemplate.EmptyPrompt
      css={EmptyStateStyle}
      color="plain"
      icon={<EuiImage size="xxl" src={`${assetBasePath}/search_lake.svg`} alt="" />}
      title={<h2>{PLUGIN_NAME}</h2>}
      body={<PlaygroundsListEmptyStateBody {...props} />}
      footer={<EmptyStateFooter />}
    />
  );
};
