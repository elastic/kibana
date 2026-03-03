/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EsqlEditorField } from './esql_editor_field';
import type { FieldHook } from '../../../../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../../../../../detection_engine/rule_creation_ui/components/query_bar_field';

const mockField = {
  value: {
    filters: [],
    query: { query: 'initial query', language: 'esql' },
    saved_id: null,
  },
  setValue: jest.fn(),
} as unknown as FieldHook<FieldValueQueryBar>;

describe('EsqlEditorField', () => {
  it('renders the ESQLLangEditor', () => {
    const { getByTestId } = render(
      <EsqlEditorField field={mockField} dataTestSubj="testEsqlEditorField" />
    );

    expect(getByTestId('testEsqlEditorField')).toBeInTheDocument();
  });
});
