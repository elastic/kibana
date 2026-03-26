/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useKibana } from '../../hooks/use_kibana';

export const GettingStartedBanner = () => {
  const {
    services: { application },
  } = useKibana();
  const assetBasePath = useAssetBasePath();
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasBorder paddingSize="none">
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={1}>
          <EuiImage size="" src={`${assetBasePath}/search_toolbox_clipped.svg`} alt="" />
        </EuiFlexItem>
        <EuiFlexItem
          grow={3}
          css={css({
            padding: euiTheme.size.l,
          })}
        >
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>
                  {i18n.translate(
                    'xpack.searchHomepage.gettingStartedBanner.h4.exploreAPITutorialsAndLabel',
                    {
                      defaultMessage:
                        'Explore API tutorials and connect Elasticsearch to your application.',
                    }
                  )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <div>
                <EuiButton
                  data-test-subj="searchHomepageGettingStartedBannerGetStartedWithElasticsearchButton"
                  iconSide="left"
                  iconType="launch"
                  color="primary"
                  size="s"
                  onClick={() => application.navigateToApp('searchGettingStarted')}
                >
                  <FormattedMessage
                    id="xpack.searchHomepage.gettingStartedBanner.getStartedWithElasticsearchButtonLabel"
                    defaultMessage="Get started with Elasticsearch"
                  />
                </EuiButton>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
