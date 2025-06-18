/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import KeywordSearchImage from '../../assets/keyword_search.svg';

import { AISearchWorkflow } from './ai_search_workflow';

const KEYWORD_TEXT = {
  image: KeywordSearchImage,
  imageAlt: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch.imageAlt', {
    defaultMessage: 'Keyword Search',
  }),
  heading: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch.title', {
    defaultMessage: 'Setup your application with Elasticsearch’s full-text search capabilities',
  }),
  subheading: i18n.translate(
    'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.description',
    {
      defaultMessage:
        'Use a semantic_text field and Elastic’s built-in ELSER machine learning model.',
    }
  ),
  featureBullets: [
    i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch.firstLine', {
      defaultMessage: 'Take advantage of EIS...',
    }),
    i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch.secondLine', {
      defaultMessage: 'Take advantage of EIS...',
    }),
    i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch.thirdLine', {
      defaultMessage: 'Take advantage of EIS...',
    }),
  ],
  buttonLabel: i18n.translate(
    'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.createKeywordIndex',
    {
      defaultMessage: 'Create a keyword index',
    }
  ),
  dataTestSubj: 'createKeywordIndexButton',
};

export const KeywordSearch: React.FC = () => {
  return <AISearchWorkflow capability={KEYWORD_TEXT} />;
};
