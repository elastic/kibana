/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen } from '@testing-library/react';

import { I18nProvider } from '@kbn/i18n-react';

import '@testing-library/jest-dom';
import { DocumentList } from './document_list';
import { DEFAULT_VALUES } from './documents_list.test';
import { DocumentsOverview } from './documents_overview';

describe('DocumentList', () => {
  test('render empty', async () => {
    render(
      <I18nProvider>
        <DocumentsOverview
          dataTelemetryIdPrefix="entSearch-telemetry"
          searchQueryCallback={() => {}}
          documentComponent={<DocumentList {...DEFAULT_VALUES} />}
        />
      </I18nProvider>
    );

    expect(screen.getByPlaceholderText('Search documents in this index')).toBeInTheDocument();
  });
});
