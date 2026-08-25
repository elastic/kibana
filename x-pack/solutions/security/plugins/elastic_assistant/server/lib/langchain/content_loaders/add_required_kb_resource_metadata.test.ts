/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addRequiredKbResourceMetadata } from './add_required_kb_resource_metadata';
import { mockExampleQueryDocsFromDirectoryLoader } from '../../../__mocks__/docs_from_directory_loader';
import { SECURITY_LABS_RESOURCE } from '../../../routes/knowledge_base/constants';

describe('addRequiredKbResourceMetadata', () => {
  const kbResource = SECURITY_LABS_RESOURCE;

  test('it includes the original metadata properties', () => {
    const EXPECTED_ADDITIONAL_KEYS_COUNT = 2; // two keys, `kbResource` and `required`

    const transformedDocs = addRequiredKbResourceMetadata({
      docs: mockExampleQueryDocsFromDirectoryLoader,
      kbResource,
      required: true,
    });

    transformedDocs.forEach((doc, i) => {
      expect(Object.keys(doc.metadata).length).toEqual(
        Object.keys(mockExampleQueryDocsFromDirectoryLoader[i].metadata).length +
          EXPECTED_ADDITIONAL_KEYS_COUNT
      );
    });
  });

  test('it adds the expected `kbResource` metadata to each document', () => {
    const transformedDocs = addRequiredKbResourceMetadata({
      docs: mockExampleQueryDocsFromDirectoryLoader,
      kbResource,
      required: true,
    });

    transformedDocs.forEach((doc) => {
      expect(doc.metadata).toHaveProperty('kbResource', kbResource);
    });
  });

  test('it adds the expected `required` metadata to each document, defaulting to true', () => {
    const transformedDocs = addRequiredKbResourceMetadata({
      docs: mockExampleQueryDocsFromDirectoryLoader,
      kbResource,
      required: true,
    });

    transformedDocs.forEach((doc) => {
      expect(doc.metadata).toHaveProperty('required', true);
    });
  });

  test('it sets the `required` metadata to the provided value', () => {
    const required = false;

    const transformedDocs = addRequiredKbResourceMetadata({
      docs: mockExampleQueryDocsFromDirectoryLoader,
      kbResource,
      required,
    });

    transformedDocs.forEach((doc) => {
      expect(doc.metadata).toHaveProperty('required', required);
    });
  });
});
