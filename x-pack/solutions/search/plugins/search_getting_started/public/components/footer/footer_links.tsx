/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { docLinks } from './doc_links';

export interface DocLinkItem {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  dataTestSubj: string;
}

export const footerLinks: DocLinkItem[] = [
  {
    id: 'searchLabs',
    title: i18n.translate('xpack.gettingStarted.searchLabs.title', {
      defaultMessage: 'Search Labs',
    }),
    description: i18n.translate('xpack.gettingStarted.searchLabs.description', {
      defaultMessage:
        'Explore the latest articles and tutorials on using Elasticsearch for AI/ML-powered search experiences.',
    }),
    buttonLabel: i18n.translate('xpack.gettingStarted.searchLabs.buttonText', {
      defaultMessage: 'Visit Elasticsearch Labs',
    }),
    buttonHref: docLinks.visitSearchLabs,
    dataTestSubj: 'gettingStartedSearchLabsButton',
  },
  {
    id: 'pythonNotebooks',
    title: i18n.translate('xpack.gettingStarted.pythonNotebooks.title', {
      defaultMessage: 'Python notebooks',
    }),
    description: i18n.translate('xpack.gettingStarted.pythonNotebooks.description', {
      defaultMessage:
        'A range of executable Python notebooks available to easily test features in a virtual environment.',
    }),
    buttonLabel: i18n.translate('xpack.gettingStarted.pythonNotebooks.buttonText', {
      defaultMessage: 'Browse our notebooks',
    }),
    buttonHref: docLinks.notebooksExamples,
    dataTestSubj: 'gettingStartedOpenNotebooksButton',
  },
  {
    id: 'elasticsearchDocs',
    title: i18n.translate('xpack.gettingStarted.elasticsearchDocs.title', {
      defaultMessage: 'Elasticsearch documentation',
    }),
    description: i18n.translate('xpack.gettingStarted.elasticsearchDocumentation.description', {
      defaultMessage:
        'Comprehensive reference material to help you learn, build, and deploy search solutions with Elasticsearch.',
    }),
    buttonLabel: i18n.translate('xpack.gettingStarted.elasticsearchDocumentation.buttonText', {
      defaultMessage: 'View documentation',
    }),
    buttonHref: docLinks.elasticsearchDocs,
    dataTestSubj: 'gettingStartedViewDocumentationButton',
  },
];
