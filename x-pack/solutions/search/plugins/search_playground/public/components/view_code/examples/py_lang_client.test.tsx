/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { PY_LANG_CLIENT } from './py_lang_client'; // Adjust the import path according to your project structure
import { ES_CLIENT_DETAILS } from '../view_code_flyout';
import { PlaygroundForm } from '../../../types';

describe('PY_LANG_CLIENT function', () => {
  const formErrors = {};
  test('renders with correct content', () => {
    // Mocking necessary values for your function
    const formValues = {
      elasticsearch_query: { query: {} },
      indices: ['index1', 'index2'],
      doc_size: 10,
      source_fields: { index1: ['field1'], index2: ['field2'] },
      prompt: 'Your prompt',
      citations: true,
      summarization_model: 'Your-new-model',
    } as unknown as PlaygroundForm;

    const clientDetails = ES_CLIENT_DETAILS('http://my-local-cloud-instance');

    const { container } = render(PY_LANG_CLIENT(formValues, formErrors, clientDetails));

    expect(container.firstChild?.textContent).toMatchSnapshot();
  });
  test('renders with correct content for multiple context fields', () => {
    // Mocking necessary values for your function
    const formValues = {
      elasticsearch_query: { query: {} },
      indices: ['index1', 'index2'],
      doc_size: 10,
      source_fields: { index1: ['field1', 'field3', 'field4'], index2: ['field2'] },
      prompt: 'Your prompt',
      citations: true,
      summarization_model: 'Your-new-model',
    } as unknown as PlaygroundForm;

    const clientDetails = ES_CLIENT_DETAILS('http://my-local-cloud-instance');

    const { container } = render(PY_LANG_CLIENT(formValues, formErrors, clientDetails));

    expect(container.firstChild?.textContent).toMatchSnapshot();
  });
});
