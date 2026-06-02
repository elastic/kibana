/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

export const createNavigationTree = (): NavigationTreeDefinition => ({
  body: [
    {
      link: 'vectordb',
      title: i18n.translate('xpack.serverlessVectordb.nav.title', {
        defaultMessage: 'Vector DB',
      }),
      icon: 'logoElasticsearch',
      renderAs: 'home',
      breadcrumbStatus: 'hidden',
    },
    {
      link: 'agent_builder',
      icon: 'productAgent',
    },
    {
      link: 'workflows',
    },
    {
      id: 'dataManagement',
      title: i18n.translate('xpack.serverlessVectordb.nav.dataManagement', {
        defaultMessage: 'Data management',
      }),
      icon: 'database',
      renderAs: 'panelOpener',
      children: [
        {
          title: i18n.translate('xpack.serverlessVectordb.nav.dataManagement.explore', {
            defaultMessage: 'Explore',
          }),
          breadcrumbStatus: 'hidden',
          children: [
            { link: 'discover', breadcrumbStatus: 'hidden' },
            { link: 'dashboards', breadcrumbStatus: 'hidden' },
          ],
        },
        {
          title: i18n.translate('xpack.serverlessVectordb.nav.dataManagement.indices', {
            defaultMessage: 'Indices and data streams',
          }),
          breadcrumbStatus: 'hidden',
          children: [
            { link: 'management:index_management', breadcrumbStatus: 'hidden' },
            { link: 'management:transform', breadcrumbStatus: 'hidden' },
          ],
        },
        {
          title: i18n.translate('xpack.serverlessVectordb.nav.dataManagement.ingest', {
            defaultMessage: 'Ingest',
          }),
          breadcrumbStatus: 'hidden',
          children: [{ link: 'management:ingest_pipelines', breadcrumbStatus: 'hidden' }],
        },
        {
          title: i18n.translate('xpack.serverlessVectordb.nav.dataManagement.dataViews', {
            defaultMessage: 'Data views',
          }),
          breadcrumbStatus: 'hidden',
          children: [{ link: 'management:dataViews', breadcrumbStatus: 'hidden' }],
        },
      ],
    },
  ],
  footer: [
    {
      id: 'tutorials',
      title: i18n.translate('xpack.serverlessVectordb.nav.tutorials', {
        defaultMessage: 'Getting started',
      }),
      link: 'vectordb:tutorials',
      icon: 'rocket',
    },
    {
      id: 'devTools',
      title: i18n.translate('xpack.serverlessVectordb.nav.devTools', {
        defaultMessage: 'Developer tools',
      }),
      link: 'dev_tools',
      icon: 'code',
    },
    {
      id: 'management',
      title: i18n.translate('xpack.serverlessVectordb.nav.management', {
        defaultMessage: 'Management',
      }),
      icon: 'gear',
      renderAs: 'panelOpener',
      children: [
        {
          title: i18n.translate('xpack.serverlessVectordb.nav.management.access', {
            defaultMessage: 'Access',
          }),
          breadcrumbStatus: 'hidden',
          children: [{ link: 'management:api_keys', breadcrumbStatus: 'hidden' }],
        },
        {
          title: i18n.translate('xpack.serverlessVectordb.nav.management.content', {
            defaultMessage: 'Content',
          }),
          breadcrumbStatus: 'hidden',
          children: [
            { link: 'management:spaces', breadcrumbStatus: 'hidden' },
            { link: 'management:objects', breadcrumbStatus: 'hidden' },
            { link: 'management:settings', breadcrumbStatus: 'hidden' },
          ],
        },
      ],
    },
  ],
});
