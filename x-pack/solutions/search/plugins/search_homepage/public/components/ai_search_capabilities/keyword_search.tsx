/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { AISearchWorkflow } from './ai_search_workflow';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

export const KeywordSearch: React.FC = () => {
  const assetBasePath = useAssetBasePath();

  const keywordSearchText = {
    image: `${assetBasePath}/keyword_search.svg`,
    imageAlt: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch.imageAlt', {
      defaultMessage: 'Keyword search',
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
        defaultMessage: 'Enhanced query flexibility to create complex search functionalities.',
      }),
      i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch.secondLine', {
        defaultMessage: 'Scalable architecture accommodates growing data sets.',
      }),
      i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch.thirdLine', {
        defaultMessage: 'Enable precise results by targeting for users or other query conditions.',
      }),
    ],
    buttonLabel: i18n.translate(
      'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.createKeywordIndex',
      {
        defaultMessage: 'Create a keyword index',
      }
    ),
    dataTestSubj: 'createKeywordIndexButton',
    workflow: 'keyword',
  };

  return <AISearchWorkflow capability={keywordSearchText} />;
};
