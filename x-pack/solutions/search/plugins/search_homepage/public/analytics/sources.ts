/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  AnalyticsFeaturedEntry,
  AnalyticsSource,
  AnalyticsSourceAudience,
  AnalyticsSourceGroup,
  AnalyticsSourceGroupId,
} from './types';

const WEB_CRAWLER_URL = 'https://github.com/elastic/crawler';

const SOURCE_GROUP_ORDER: Readonly<
  Record<AnalyticsSourceAudience, readonly AnalyticsSourceGroupId[]>
> = {
  all: ['sendEvents', 'search', 'streaming', 'objectStorage'],
  events: ['streaming', 'sendEvents', 'objectStorage'],
};

/** The groups the ways to add data are shown in for an audience, in display order. */
export const getAnalyticsSourceGroups = (
  audience: AnalyticsSourceAudience = 'all'
): readonly AnalyticsSourceGroup[] => {
  const groups: readonly AnalyticsSourceGroup[] = [
    {
      id: 'sendEvents',
      title: i18n.translate('xpack.searchHomepage.analytics.sourceGroups.sendData.title', {
        defaultMessage: 'Send data',
      }),
      description: i18n.translate(
        'xpack.searchHomepage.analytics.sourceGroups.sendData.description',
        {
          defaultMessage:
            'Push data from your application, load a file, or build your own integration.',
        }
      ),
    },
    {
      id: 'search',
      title: i18n.translate('xpack.searchHomepage.analytics.sourceGroups.search.title', {
        defaultMessage: 'Search content',
      }),
      description: i18n.translate(
        'xpack.searchHomepage.analytics.sourceGroups.search.description',
        { defaultMessage: 'Bring in documents, websites and other content to search.' }
      ),
    },
    {
      id: 'streaming',
      title: i18n.translate('xpack.searchHomepage.analytics.sourceGroups.streaming.title', {
        defaultMessage: 'Streaming',
      }),
      description: i18n.translate(
        'xpack.searchHomepage.analytics.sourceGroups.streaming.description',
        { defaultMessage: 'Read events continuously from a stream or message queue.' }
      ),
    },
    {
      id: 'objectStorage',
      title: i18n.translate('xpack.searchHomepage.analytics.sourceGroups.objectStorage.title', {
        defaultMessage: 'Object storage',
      }),
      description: i18n.translate(
        'xpack.searchHomepage.analytics.sourceGroups.objectStorage.description',
        { defaultMessage: 'Load files from a bucket, or query them where they are.' }
      ),
    },
  ];

  return SOURCE_GROUP_ORDER[audience].flatMap((groupId) =>
    groups.filter(({ id }) => id === groupId)
  );
};

interface FeaturedLayout {
  leading: readonly string[];
  trailing: readonly string[];
  hasSampleEvents: boolean;
}

const FEATURED_LAYOUT: Readonly<Record<AnalyticsSourceAudience, FeaturedLayout>> = {
  all: { leading: ['fileUpload', 'eventsIndex'], trailing: ['webCrawl'], hasSampleEvents: false },
  events: { leading: ['eventsIndex'], trailing: ['fileUpload'], hasSampleEvents: true },
};

/**
 * The ways in shown before the full list is disclosed, in display order. Every audience gets the
 * file upload, the API and the event sources as a list of their own; the website crawl is featured
 * for everyone, and the sample events for users bringing in events. A source is only shown where
 * it is available.
 */
export const getFeaturedAnalyticsEntries = (
  audience: AnalyticsSourceAudience = 'all'
): readonly AnalyticsFeaturedEntry[] => {
  const { leading, trailing, hasSampleEvents } = FEATURED_LAYOUT[audience];
  const sources = getAnalyticsSources();
  const toEntries = (featuredIds: readonly string[]): AnalyticsFeaturedEntry[] =>
    featuredIds.flatMap((featuredId) =>
      sources
        .filter(({ id }) => id === featuredId)
        .map((source): AnalyticsFeaturedEntry => ({ kind: 'source', source }))
    );
  const sampleEntries: AnalyticsFeaturedEntry[] = hasSampleEvents
    ? [
        {
          kind: 'sampleEvents',
          sample: {
            id: 'sampleEvents',
            title: i18n.translate('xpack.searchHomepage.analytics.sampleEvents.title', {
              defaultMessage: 'Try sample web events',
            }),
            description: i18n.translate('xpack.searchHomepage.analytics.sampleEvents.description', {
              defaultMessage: 'Page views, carts and purchases from an online store.',
            }),
            iconType: 'flask',
          },
        },
      ]
    : [];

  return [
    ...toEntries(leading),
    {
      kind: 'sourceList',
      list: {
        id: 'eventStream',
        title: i18n.translate('xpack.searchHomepage.analytics.sourceLists.eventStream.title', {
          defaultMessage: 'Set up an event stream',
        }),
        description: i18n.translate(
          'xpack.searchHomepage.analytics.sourceLists.eventStream.description',
          { defaultMessage: 'Connect Kafka, Kinesis, Pub/Sub or another stream of events.' }
        ),
        iconType: 'timeline',
        audience: 'events',
      },
    },
    ...toEntries(trailing),
    ...sampleEntries,
  ];
};

/** Every way to add data offered on the home and guided setup, each with the place it links to. */
export const getAnalyticsSources = (): readonly AnalyticsSource[] => [
  {
    id: 'kafka',
    group: 'streaming',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.kafka.title', {
      defaultMessage: 'Apache Kafka',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.kafka.description', {
      defaultMessage: 'Consume events from Kafka topics.',
    }),
    iconType: 'logoKafka',
    target: { type: 'integrationSearch', searchTerm: 'kafka' },
  },
  {
    id: 'kinesis',
    group: 'streaming',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.kinesis.title', {
      defaultMessage: 'Amazon Kinesis and MSK',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.kinesis.description', {
      defaultMessage: 'Read from Kinesis data streams or managed Kafka on AWS.',
    }),
    iconType: 'logoAWS',
    target: { type: 'integrationSearch', searchTerm: 'kinesis' },
  },
  {
    id: 'pubsub',
    group: 'streaming',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.pubsub.title', {
      defaultMessage: 'Google Pub/Sub',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.pubsub.description', {
      defaultMessage: 'Subscribe to Pub/Sub topics on Google Cloud.',
    }),
    iconType: 'logoGCP',
    target: { type: 'integrationSearch', searchTerm: 'pubsub' },
  },
  {
    id: 'eventHubs',
    group: 'streaming',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.eventHubs.title', {
      defaultMessage: 'Azure Event Hubs',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.eventHubs.description', {
      defaultMessage: 'Read events from Azure Event Hubs.',
    }),
    iconType: 'logoAzure',
    target: { type: 'integrationSearch', searchTerm: 'event hub' },
  },
  {
    id: 'messageQueues',
    group: 'streaming',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.messageQueues.title', {
      defaultMessage: 'Message queues',
    }),
    description: i18n.translate(
      'xpack.searchHomepage.analytics.sources.messageQueues.description',
      { defaultMessage: 'Browse RabbitMQ, NATS and other message brokers.' }
    ),
    iconType: 'queue',
    target: { type: 'integrationCategory', categoryPath: 'observability/message_queue' },
  },
  {
    id: 'httpEndpoint',
    group: 'sendEvents',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.httpEndpoint.title', {
      defaultMessage: 'HTTP endpoint',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.httpEndpoint.description', {
      defaultMessage: 'Receive webhooks and JSON events over HTTP.',
    }),
    iconType: 'globe',
    target: { type: 'integrationSearch', searchTerm: 'http endpoint' },
  },
  {
    id: 'eventsIndex',
    group: 'sendEvents',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.eventsIndex.title', {
      defaultMessage: 'Send events with the API',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.eventsIndex.description', {
      defaultMessage: 'Create an events index and get code for curl, JavaScript and Python.',
    }),
    iconType: 'code',
    target: { type: 'eventsIndex' },
  },
  {
    id: 'fileUpload',
    group: 'sendEvents',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.fileUpload.title', {
      defaultMessage: 'Upload a file',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.fileUpload.description', {
      defaultMessage: 'Load a CSV or NDJSON file from your computer.',
    }),
    iconType: 'upload',
    target: { type: 'fileUpload' },
  },
  {
    id: 'customIntegration',
    group: 'sendEvents',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.customIntegration.title', {
      defaultMessage: 'Custom integration',
    }),
    description: i18n.translate(
      'xpack.searchHomepage.analytics.sources.customIntegration.description',
      { defaultMessage: 'Build an integration for a source that is not listed.' }
    ),
    iconType: 'wrench',
    target: { type: 'integrationCreate' },
  },
  {
    id: 'sampleDataDirectory',
    group: 'sendEvents',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.sampleDataDirectory.title', {
      defaultMessage: 'Kibana sample data sets',
    }),
    description: i18n.translate(
      'xpack.searchHomepage.analytics.sources.sampleDataDirectory.description',
      { defaultMessage: 'Browse the sample data sets that come with Kibana.' }
    ),
    iconType: 'folderOpen',
    target: { type: 'sampleDataDirectory' },
  },
  {
    id: 'webCrawl',
    group: 'search',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.webCrawl.title', {
      defaultMessage: 'Crawl a website',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.webCrawl.description', {
      defaultMessage: 'Enter a URL and index its pages for search.',
    }),
    iconType: 'globe',
    target: { type: 'webCrawl' },
  },
  {
    id: 'openWebCrawler',
    group: 'search',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.openWebCrawler.title', {
      defaultMessage: 'Elastic Open Web Crawler',
    }),
    description: i18n.translate(
      'xpack.searchHomepage.analytics.sources.openWebCrawler.description',
      { defaultMessage: 'Run the open source crawler yourself for larger sites. Opens on GitHub.' }
    ),
    iconType: 'archive',
    target: { type: 'externalUrl', url: WEB_CRAWLER_URL },
  },
  {
    id: 'apiTutorial',
    group: 'search',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.apiTutorial.title', {
      defaultMessage: 'Search API tutorial',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.apiTutorial.description', {
      defaultMessage: 'Create an index, add documents and run your first searches in Console.',
    }),
    iconType: 'commandLine',
    target: { type: 'apiTutorial' },
  },
  {
    id: 'createIndex',
    group: 'search',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.createIndex.title', {
      defaultMessage: 'Create an index',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.createIndex.description', {
      defaultMessage: 'Start from an empty index in Index Management.',
    }),
    iconType: 'tablePlus',
    target: { type: 'createIndex' },
  },
  {
    id: 's3',
    group: 'objectStorage',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.s3.title', {
      defaultMessage: 'Amazon S3',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.s3.description', {
      defaultMessage: 'Load objects from S3 buckets as they arrive.',
    }),
    iconType: 'logoAWS',
    target: { type: 'integrationSearch', searchTerm: 's3' },
  },
  {
    id: 'gcs',
    group: 'objectStorage',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.gcs.title', {
      defaultMessage: 'Google Cloud Storage',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.gcs.description', {
      defaultMessage: 'Load objects from Cloud Storage buckets.',
    }),
    iconType: 'logoGCP',
    target: { type: 'integrationSearch', searchTerm: 'google cloud storage' },
  },
  {
    id: 'azureBlob',
    group: 'objectStorage',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.azureBlob.title', {
      defaultMessage: 'Azure Blob Storage',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.sources.azureBlob.description', {
      defaultMessage: 'Load blobs from Azure storage containers.',
    }),
    iconType: 'logoAzure',
    target: { type: 'integrationSearch', searchTerm: 'azure blob storage' },
  },
  {
    id: 'dataFederation',
    group: 'objectStorage',
    title: i18n.translate('xpack.searchHomepage.analytics.sources.dataFederation.title', {
      defaultMessage: 'Query files in place',
    }),
    description: i18n.translate(
      'xpack.searchHomepage.analytics.sources.dataFederation.description',
      { defaultMessage: 'Query object storage directly.' }
    ),
    iconType: 'storage',
    target: { type: 'dataFederation' },
  },
];
