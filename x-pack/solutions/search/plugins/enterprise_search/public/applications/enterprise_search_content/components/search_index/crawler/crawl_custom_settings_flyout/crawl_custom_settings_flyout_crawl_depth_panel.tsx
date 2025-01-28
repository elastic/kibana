/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

interface CrawlCustomSettingsFlyoutCrawlDepthPanelProps {
  maxCrawlDepth: number;
  onSelectMaxCrawlDepth: (depth: number) => void;
}

export const CrawlCustomSettingsFlyoutCrawlDepthPanelWithLogicProps: React.FC = () => {
  const { maxCrawlDepth } = useValues(CrawlCustomSettingsFlyoutLogic);
  const { onSelectMaxCrawlDepth } = useActions(CrawlCustomSettingsFlyoutLogic);

  return (
    <CrawlCustomSettingsFlyoutCrawlDepthPanel
      maxCrawlDepth={maxCrawlDepth}
      onSelectMaxCrawlDepth={onSelectMaxCrawlDepth}
    />
  );
};

export const CrawlCustomSettingsFlyoutCrawlDepthPanel: React.FC<
  CrawlCustomSettingsFlyoutCrawlDepthPanelProps
> = ({ maxCrawlDepth, onSelectMaxCrawlDepth }) => {
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.maxCrawlDepthFieldLabel',
              {
                defaultMessage: 'Max crawl depth',
              }
            )}
          >
            <EuiFieldNumber
              data-telemetry-id="entSearchContent-crawler-customCrawlSettings-maxCrawlDepth"
              min={1}
              value={maxCrawlDepth}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onSelectMaxCrawlDepth(parseInt(e.target.value, 10))
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.maxCrawlDepthFieldDescription',
              {
                defaultMessage:
                  'Set a max crawl depth to specify how many pages deep the crawler should traverse. Set the value to one (1) to limit the crawl to only the entry points.',
              }
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
