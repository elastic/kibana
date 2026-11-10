/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { ElasticsearchHomePageProps } from '@kbn/elasticsearch-home/public';

const TELEMETRY_PREFIX = 'searchHomepage';
const STORAGE_KEY_PREFIX = 'searchHomepage';
const GETTING_STARTED_APP_ID = 'searchGettingStarted';
const WEB_CRAWLER_URL = 'https://github.com/elastic/crawler';

const AGENT_ONBOARDING_MESSAGE = '/elasticsearch-onboarding';

// Matches the prompt Getting Started offers, so both pages install the same skill.
const IDE_PROMPT = [
  'Install the elasticsearch onboarding skill:',
  '```sh\nnpx skills add elastic/agent-skills --skill elasticsearch-onboarding -y\n```',
  AGENT_ONBOARDING_MESSAGE,
].join('\n');

interface HomeConfigDeps {
  application: ApplicationStart;
}

/** The Elasticsearch identity for the shared home page */
export const getSearchHomeConfig = ({
  application,
}: HomeConfigDeps): ElasticsearchHomePageProps => ({
  telemetryPrefix: TELEMETRY_PREFIX,
  storageKeyPrefix: STORAGE_KEY_PREFIX,
  dataCardTooltip: i18n.translate('xpack.searchHomepage.home.dataCard.tooltip', {
    defaultMessage: 'Totals reflect indices and data streams you can access.',
  }),
  ideSetup: {
    prompt: IDE_PROMPT,
    agentInitialMessage: AGENT_ONBOARDING_MESSAGE,
    agentSessionTag: 'elasticsearch-home',
  },
  banner: {
    title: i18n.translate('xpack.searchHomepage.home.banner.title', {
      defaultMessage: 'Get started with Elasticsearch',
    }),
    description: i18n.translate('xpack.searchHomepage.home.banner.description', {
      defaultMessage:
        'Use our API guides, agent skills, or set up a starter app to explore the powerful features of Elasticsearch for your next project.',
    }),
    buttonLabel: i18n.translate('xpack.searchHomepage.home.banner.button', {
      defaultMessage: 'Get started',
    }),
    onGetStarted: () => application.navigateToApp(GETTING_STARTED_APP_ID),
  },
  addDataLinks: [
    {
      key: 'devTools',
      iconType: 'code',
      label: i18n.translate('xpack.searchHomepage.home.addData.devTools', {
        defaultMessage: 'Open Console and interact with the API',
      }),
      onClick: () => application.navigateToApp('dev_tools'),
      testSubj: 'addDataDevToolsLink',
      telemetryId: `${TELEMETRY_PREFIX}-addData-devTools`,
    },
    {
      key: 'uploadFile',
      iconType: 'upload',
      label: i18n.translate('xpack.searchHomepage.home.addData.uploadFile', {
        defaultMessage: 'Upload a file',
      }),
      onClick: () =>
        application.navigateToApp('home', { path: '#/tutorial_directory/fileDataViz' }),
      testSubj: 'addDataUploadFileLink',
      telemetryId: `${TELEMETRY_PREFIX}-addData-uploadFile`,
    },
    {
      key: 'webCrawler',
      iconType: 'archive',
      label: i18n.translate('xpack.searchHomepage.home.addData.webCrawler', {
        defaultMessage: 'Elastic’s Open Web Crawler',
      }),
      onClick: () => window.open(WEB_CRAWLER_URL, '_blank', 'noopener,noreferrer'),
      testSubj: 'addDataWebCrawlerLink',
      telemetryId: `${TELEMETRY_PREFIX}-addData-webCrawler`,
    },
  ],
});
