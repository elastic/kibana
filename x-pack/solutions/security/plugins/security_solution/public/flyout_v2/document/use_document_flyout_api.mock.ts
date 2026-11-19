/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentFlyoutApi } from './use_document_flyout_api';

/**
 * Returns a `useDocumentFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 * Use with `jest.mocked(useDocumentFlyoutApi).mockReturnValue(createDocumentFlyoutApiMock())`
 * and assert against the individual method you care about.
 */
export const createDocumentFlyoutApiMock = (): jest.Mocked<DocumentFlyoutApi> => ({
  openDocumentFlyoutFromIndex: jest.fn(),
  openDocumentFlyoutFromIndexAsChild: jest.fn(),
  openDocumentFlyoutFromPattern: jest.fn(),
  openAnalyzer: jest.fn(),
  openSessionView: jest.fn(),
  openDocumentEntities: jest.fn(),
  openDocumentCorrelations: jest.fn(),
  openDocumentResponse: jest.fn(),
  openDocumentThreatIntelligence: jest.fn(),
  openDocumentPrevalence: jest.fn(),
  openDocumentInvestigationGuide: jest.fn(),
  openDocumentGraph: jest.fn(),
});
