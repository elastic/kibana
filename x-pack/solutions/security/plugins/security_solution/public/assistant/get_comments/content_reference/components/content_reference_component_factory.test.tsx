/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentReferences } from '@kbn/elastic-assistant-common';
import { contentReferenceComponentFactory } from './content_reference_component_factory';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ContentReferenceNode } from '../content_reference_parser';

const testContentReferenceNode = { contentReferenceId: '1' } as ContentReferenceNode;

describe('contentReferenceComponentFactory', () => {
  it.each([
    [
      'EsqlQueryReference',
      {
        '1': {
          id: '1',
          type: 'EsqlQuery',
          query: '',
          label: '',
        },
      } as ContentReferences,
      testContentReferenceNode,
    ],
    [
      'KnowledgeBaseEntryReference',
      {
        '1': {
          id: '1',
          type: 'KnowledgeBaseEntry',
          knowledgeBaseEntryId: '',
          knowledgeBaseEntryName: '',
        },
      } as ContentReferences,
      testContentReferenceNode,
    ],
    [
      'ProductDocumentationReference',
      {
        '1': {
          id: '1',
          type: 'ProductDocumentation',
          title: '',
          url: '',
        },
      } as ContentReferences,
      testContentReferenceNode,
    ],
    [
      'SecurityAlertReference',
      {
        '1': {
          id: '1',
          type: 'SecurityAlert',
          alertId: '',
        },
      } as ContentReferences,
      testContentReferenceNode,
    ],
    [
      'SecurityAlertsPageReference',
      {
        '1': {
          id: '1',
          type: 'SecurityAlertsPage',
        },
      } as ContentReferences,
      testContentReferenceNode,
    ],
  ])(
    "Renders component: '%s'",
    async (
      testId: string,
      contentReferences: ContentReferences,
      contentReferenceNode: ContentReferenceNode
    ) => {
      const Component = contentReferenceComponentFactory({
        contentReferences,
        contentReferencesVisible: true,
      });

      render(<Component {...contentReferenceNode} />);

      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  );

  it('renders nothing when specific contentReference is undefined', async () => {
    const Component = contentReferenceComponentFactory({
      contentReferences: {},
      contentReferencesVisible: true,
    });

    const { container } = render(
      <Component
        {...({ contentReferenceId: '1', contentReferenceCount: 1 } as ContentReferenceNode)}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('[1]')).not.toBeInTheDocument();
  });

  it('renders placeholder if contentReferences are undefined', async () => {
    const Component = contentReferenceComponentFactory({
      contentReferences: undefined,
      contentReferencesVisible: true,
    });

    render(
      <Component
        {...({ contentReferenceId: '1', contentReferenceCount: 1 } as ContentReferenceNode)}
      />
    );

    expect(screen.getByTestId('ContentReferenceButton')).toBeInTheDocument();
    expect(screen.getByText('[1]')).toBeInTheDocument();
  });
});
