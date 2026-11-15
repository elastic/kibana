/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, DocLinksStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { ElasticsearchHomePageProps } from '@kbn/elasticsearch-home/public';
import {
  GETTING_STARTED_DEEP_LINK_ID,
  GETTING_STARTED_PATH,
  VECTORDB_APP_ID,
} from '../common/constants';

const TELEMETRY_PREFIX = 'serverlessVectordb-home';
const STORAGE_KEY_PREFIX = 'vectordb.home';

const IDE_PROMPT = [
  'Install the Elastic skills:',
  '`npx skills add elastic/agent-skills`',
  '',
  'Help me get started with my Elastic Vector Database',
].join('\n');

const AGENT_ONBOARDING_MESSAGE = '/elasticsearch-onboarding';

interface HomeConfigDeps {
  application: ApplicationStart;
  docLinks: DocLinksStart;
}

export const getVectordbHomeConfig = ({
  application,
  docLinks,
}: HomeConfigDeps): ElasticsearchHomePageProps => ({
  telemetryPrefix: TELEMETRY_PREFIX,
  storageKeyPrefix: STORAGE_KEY_PREFIX,
  docsLink: {
    href: docLinks.links.enterpriseSearch.vectorDatabaseFullTextSearch,
    label: i18n.translate('xpack.serverlessVectordb.home.learnMoreLink', {
      defaultMessage: 'Learn more about Elasticsearch Vector Database',
    }),
  },
  ideSetup: {
    prompt: IDE_PROMPT,
    agentInitialMessage: AGENT_ONBOARDING_MESSAGE,
    agentSessionTag: 'vectordb-home',
  },
  banner: {
    title: i18n.translate('xpack.serverlessVectordb.home.banner.title', {
      defaultMessage: 'Set up your Elasticsearch Vector Database in 2 simple steps',
    }),
    description: i18n.translate('xpack.serverlessVectordb.home.banner.description', {
      defaultMessage:
        'Use our getting started guides or browse documentation, articles and notebooks to generate embeddings from your content or store your current vectors in an optimized index.',
    }),
    buttonLabel: i18n.translate('xpack.serverlessVectordb.home.banner.button', {
      defaultMessage: 'Get started',
    }),
    onGetStarted: () =>
      application.navigateToApp(VECTORDB_APP_ID, { deepLinkId: GETTING_STARTED_DEEP_LINK_ID }),
  },
  primaryAddDataLink: {
    key: 'embeddings',
    iconType: 'rocket',
    label: i18n.translate('xpack.serverlessVectordb.home.addData.embeddings', {
      defaultMessage: 'Generate or store embeddings',
    }),
    onClick: () => application.navigateToApp(VECTORDB_APP_ID, { path: GETTING_STARTED_PATH }),
    testSubj: 'addDataEmbeddingsLink',
    telemetryId: `${TELEMETRY_PREFIX}-addData-embeddings`,
  },
});
