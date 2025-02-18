/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AnalyticsConfig } from './analytics_collection_integrate_view';

export const javascriptClientEmbedSteps = (analyticsConfig: AnalyticsConfig) => [
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepOne.title',
      {
        defaultMessage: 'Install client',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepOne.description',
              {
                defaultMessage:
                  'Download the behavioral analytics javascript tracker client from NPM.',
              }
            )}
          </p>
          <EuiCodeBlock language="bash" isCopyable>
            {'npm install @elastic/behavioral-analytics-javascript-tracker'}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepTwo.title',
      {
        defaultMessage: 'Import the client',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepTwo.description',
              {
                defaultMessage: 'Import the client in your application.',
              }
            )}
          </p>
          <EuiCodeBlock language="bash" isCopyable>
            {`import {
  createTracker,
  trackPageView,
  trackSearch,
  trackSearchClick
} from "@elastic/behavioral-analytics-javascript-tracker";`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepThree.title',
      {
        defaultMessage: 'Initialize the client',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepThree.description',
              {
                defaultMessage:
                  'Use createTracker method to initialize the tracker with your Configuration. You will then be able to use the tracker to send events to Behavioral Analytics.',
              }
            )}
          </p>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepThree.descriptionTwo',
              {
                defaultMessage:
                  'Once you have called createTracker, you can use the tracker methods such as trackPageView to send events to Behavioral Analytics.',
              }
            )}
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {`createTracker({
  endpoint: "${analyticsConfig.endpoint}",
  collectionName: "${analyticsConfig.collectionName}",
  apiKey: "${analyticsConfig.apiKey}"
});`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepFour.title',
      {
        defaultMessage: 'Dispatch Pageview and search behavior events',
      }
    ),
    children: (
      <>
        <EuiText grow={false}>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepFour.descriptionTwo',
              {
                defaultMessage:
                  'Once initialized, you will be able to track page views in your application.',
              }
            )}
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {`import { useEffect } from 'react';

// track a page view in React

const SearchPage = (props) => {
  useEffect(() => {
    trackPageView();
  }, []);

  return (
    <div>
      <h1>Search Page</h1>
    </div>
  );
};`}
          </EuiCodeBlock>
          <EuiSpacer size="m" />
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.stepFour.descriptionThree',
              {
                defaultMessage:
                  'You can also use trackSearch and trackSearchClick to track what your customers are searching and clicking on in your application.',
              }
            )}
          </p>
          <EuiCodeBlock language="javascript" isCopyable>
            {`
import { trackSearch } from '@elastic/behavioral-analytics-javascript-tracker';

const SearchResult = ({ hit }) => {

  const clickHandler = () => {
    trackSearchClick({
      document: { id: hit.id, index: "products" },
      page: {
        url: "http://my-website.com/products/123"
      },
      search: {
        query: "search term",
        filters: {},
        page: { current: 1, size: 10 },
        results: {
          items: [
            {
              document: {
                id: "123",
                index: "products",
              },
              page: {
                url: "http://my-website.com/products/123",
              },
            },
          ],
          total_results: 10
        },
        sort: {
          name: "relevance",
        },
        search_application: "website",
      }
    })
  }

  return (
    <a onClick={clickHandler}>
      <h2>{hit.title}</h2>
    </a>
  )
}`}
          </EuiCodeBlock>
        </EuiText>
      </>
    ),
  },
];
