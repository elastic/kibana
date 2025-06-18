/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import VectorSearchImage from '../../assets/vector_search.svg';
import { AISearchWorkflow } from './ai_search_workflow';

const VECTOR_SEARCH_TEXT = {
  image: VectorSearchImage,
  imageAlt: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.vectorSearch.imageAlt', {
    defaultMessage: 'Vector Search',
  }),
  heading: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.vectorSearch.title', {
    defaultMessage: 'Store and search your vector embeddings',
  }),
  subheading: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.vectorSearch.description', {
    defaultMessage:
      'Use Elasticsearch as a datastore for vector embeddings andenable lightning-fast searches and insights.',
  }),
  featureBullets: [
    i18n.translate('xpack.searchHomepage.aiSearchCapabilities.vectorSearch.firstLine', {
      defaultMessage: 'A single solution to generate, store and search your vector embeddings. ',
    }),
    i18n.translate('xpack.searchHomepage.aiSearchCapabilities.vectorSearch.secondLine', {
      defaultMessage: 'Utilize the dense_vector field type for approximate kNN searches.',
    }),
    i18n.translate('xpack.searchHomepage.aiSearchCapabilities.vectorSearch.thirdLine', {
      defaultMessage: 'Choose from several memory quantization strategies to reduce bloat.',
    }),
  ],
  buttonLabel: i18n.translate(
    'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.createVectorIndex',
    {
      defaultMessage: 'Create a vector optimized index',
    }
  ),
  dataTestSubj: 'createVectorIndexButton',
};

export const VectorSearch: React.FC = () => {
  return <AISearchWorkflow capability={VECTOR_SEARCH_TEXT} />;
};
