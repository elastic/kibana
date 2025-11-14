/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { PLUGIN_NAME } from '../common';
import { SearchPlaygroundPageTemplate } from './layout/page_template';
import { usePlaygroundBreadcrumbs } from './hooks/use_playground_breadcrumbs';
import { useAssetBasePath } from './hooks/use_asset_base_path';
import { PlaygroundsListEmptyStateBody } from './components/playgrounds_list/empty_state/body';
import { PlaygroundLicensingCTA } from './components/licensing_cta';

// Override styling for empty state to allow it to grow wider for content we provide
const EmptyStateStyle = css`
  min-inline-size: 64rem;
  .euiCard__content {
    max-inline-size: 60em;
  }
`;

export const PlaygroundUnavailable = () => {
  usePlaygroundBreadcrumbs();
  const assetBasePath = useAssetBasePath();

  return (
    <SearchPlaygroundPageTemplate restrictWidth={false} data-test-subj="playgroundsUnlicensed">
      <KibanaPageTemplate.Section alignment="center">
        <EuiCard
          hasBorder
          css={EmptyStateStyle}
          display="plain"
          icon={<EuiImage size="xxl" src={`${assetBasePath}/search_lake.svg`} alt="" />}
          title={<h2>{PLUGIN_NAME}</h2>}
          betaBadgeProps={{
            label: i18n.translate('xpack.searchPlayground.unavailable.licenseBadge.title', {
              defaultMessage: 'Enterprise Feature',
            }),
            tooltipContent: i18n.translate(
              'xpack.searchPlayground.unavailable.licenseBadge.tooltip',
              {
                defaultMessage: 'You need an Enterprise license to use the Playground.',
              }
            ),
          }}
          description={<PlaygroundsListEmptyStateBody CTAContent={<PlaygroundLicensingCTA />} />}
        />
      </KibanaPageTemplate.Section>
    </SearchPlaygroundPageTemplate>
  );
};
