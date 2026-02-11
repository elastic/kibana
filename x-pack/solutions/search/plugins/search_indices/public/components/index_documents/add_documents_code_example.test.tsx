/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AddDocumentsCodeExample, exampleTexts } from './add_documents_code_example';
import { generateSampleDocument } from '../../utils/document_generation';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../utils/language', () => ({
  getDefaultCodingLanguage: jest.fn().mockReturnValue('python'),
}));

jest.mock('../../hooks/use_asset_base_path', () => ({
  useAssetBasePath: jest.fn().mockReturnValue('/plugins/'),
}));

jest.mock('../../utils/document_generation', () => ({
  generateSampleDocument: jest.fn(),
}));

jest.mock('../../hooks/use_elasticsearch_url', () => ({
  useElasticsearchUrl: jest.fn(),
}));

jest.mock('../../hooks/api/use_onboarding_data', () => ({
  useOnboardingTokenQuery: jest.fn().mockReturnValue({ data: { token: 'default' } }),
}));

jest.mock('@kbn/search-api-keys-components', () => ({
  useSearchApiKey: jest.fn().mockReturnValue({ apiKey: 'test-api-key' }),
}));

jest.mock('../../hooks/use_kibana', () => {
  const { notificationServiceMock } = jest.requireActual('@kbn/core/public/mocks');
  return {
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {},
        share: {},
        console: {},
        notifications: notificationServiceMock.createStartContract(),
      },
    }),
  };
});

jest.mock('../../contexts/usage_tracker_context', () => ({
  useUsageTracker: jest.fn().mockReturnValue({
    count: jest.fn(),
    click: jest.fn(),
  }),
}));

describe('AddDocumentsCodeExample', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSampleDocument', () => {
    it('pass basic examples when mapping is default', () => {
      const indexName = 'test-index';
      const mappingProperties: Record<string, MappingProperty> = {
        vector: { type: 'dense_vector', dims: 3 },
        text: { type: 'text' },
      };

      render(
        <MemoryRouter>
          <AddDocumentsCodeExample indexName={indexName} mappingProperties={mappingProperties} />
        </MemoryRouter>
      );

      exampleTexts.forEach((text, index) => {
        expect(generateSampleDocument).toHaveBeenNthCalledWith(index + 1, mappingProperties, text);
      });
    });

    it('pass basic examples when mapping is not passed', () => {
      const indexName = 'test-index';

      render(
        <MemoryRouter>
          <AddDocumentsCodeExample indexName={indexName} mappingProperties={{}} />
        </MemoryRouter>
      );

      const mappingProperties: Record<string, MappingProperty> = {
        text: { type: 'semantic_text' },
      };

      exampleTexts.forEach((text, index) => {
        expect(generateSampleDocument).toHaveBeenNthCalledWith(index + 1, mappingProperties, text);
      });
    });

    it('pass examples when mapping is default with extra vector fields', () => {
      const indexName = 'test-index';
      const mappingProperties: Record<string, MappingProperty> = {
        vector: {
          type: 'dense_vector',
          dims: 3,
          // @ts-expect-error `extra` is not a valid MappingDenseVectorSimilarity
          similarity: 'extra',
        },
        text: { type: 'text' },
      };

      render(
        <MemoryRouter>
          <AddDocumentsCodeExample indexName={indexName} mappingProperties={mappingProperties} />
        </MemoryRouter>
      );

      expect(generateSampleDocument).toHaveBeenCalledTimes(3);

      exampleTexts.forEach((text, index) => {
        expect(generateSampleDocument).toHaveBeenNthCalledWith(index + 1, mappingProperties, text);
      });
    });
  });
});
