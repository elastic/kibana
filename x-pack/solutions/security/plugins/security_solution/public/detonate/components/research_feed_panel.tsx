/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';

import { ENABLE_NEWS_FEED_SETTING, NEWS_FEED_URL_SETTING } from '../../../common/constants';
import { StatefulNewsFeed } from '../../common/components/news_feed';
import { RESEARCH_LINK, RESEARCH_TITLE } from '../translations';

const SECURITY_LABS_URL = 'https://www.elastic.co/security-labs';

/**
 * Reuses the Security Solution news feed.
 *
 * This is the Elastic-curated security feed, not a Security Labs article feed filtered by tag:
 * Kibana has no live Labs feed, and adding one would need either an Elastic-hosted CORS-enabled
 * endpoint or a server proxy with SSRF review. The feed component renders nothing when the
 * newsfeed is disabled or unreachable, such as in air-gapped deployments, so the panel always
 * carries a direct link to Security Labs as well.
 */
const ResearchFeedPanelComponent: React.FC = () => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="detonateResearchFeed">
    <EuiTitle size="xs">
      <h3>{RESEARCH_TITLE}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    <StatefulNewsFeed
      enableNewsFeedSetting={ENABLE_NEWS_FEED_SETTING}
      newsFeedSetting={NEWS_FEED_URL_SETTING}
    />
    <EuiSpacer size="s" />
    <EuiLink href={SECURITY_LABS_URL} target="_blank" external>
      {RESEARCH_LINK}
    </EuiLink>
  </EuiPanel>
);

export const ResearchFeedPanel = React.memo(ResearchFeedPanelComponent);
