/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from '@langchain/core/documents';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchRetrieverContentField } from '../types';
import { getValueForSelectedField } from './get_value_for_selected_field';

export const contextDocumentHitMapper =
  (contentField: ElasticsearchRetrieverContentField) =>
  (hit: SearchHit): Document => {
    let pageContent: string = '';
    const makePageContentForField = (field: string) => {
      const fieldValue = getValueForSelectedField(hit, field);
      return fieldValue.length > 0 ? `${field}: ${fieldValue}` : '';
    };
    if (typeof contentField === 'string') {
      pageContent = makePageContentForField(contentField);
    } else {
      const pageContentFieldKey = contentField[hit._index];
      if (typeof pageContentFieldKey === 'string') {
        pageContent = makePageContentForField(pageContentFieldKey);
      } else {
        pageContent = pageContentFieldKey
          .map((field) => makePageContentForField(field))
          .filter((fieldContent) => fieldContent.length > 0)
          .join('\n');
      }
    }

    return new Document({
      pageContent,
      metadata: {
        _score: hit._score,
        _id: hit._id,
        _index: hit._index,
      },
    });
  };
