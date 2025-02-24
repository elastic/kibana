/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentReference } from '@kbn/elastic-assistant-common';
import { ContentReferenceComponentFactory } from './content_reference_component_factory';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type {
  InvalidContentReferenceNode,
  ResolvedContentReferenceNode,
  UnresolvedContentReferenceNode,
} from '../content_reference_parser';

jest.mock('../../../../common/lib/kibana', () => ({
  useNavigation: jest.fn().mockReturnValue({
    navigateTo: jest.fn(),
  }),
  useKibana: jest.fn().mockReturnValue({
    services: {
      discover: {
        locator: jest.fn(),
      },
      application: {
        navigateToApp: jest.fn(),
      },
    },
  }),
}));

describe('contentReferenceComponentFactory', () => {
  it.each([
    [
      'EsqlQueryReference',
      {
        id: '1',
        type: 'EsqlQuery',
        query: '',
        label: '',
      } as ContentReference,
    ],
    [
      'KnowledgeBaseEntryReference',
      {
        id: '1',
        type: 'KnowledgeBaseEntry',
        knowledgeBaseEntryId: '',
        knowledgeBaseEntryName: '',
      } as ContentReference,
    ],
    [
      'ProductDocumentationReference',
      {
        id: '1',
        type: 'ProductDocumentation',
        title: '',
        url: '',
      } as ContentReference,
    ],
    [
      'SecurityAlertReference',
      {
        id: '1',
        type: 'SecurityAlert',
        alertId: '',
      } as ContentReference,
    ],
    [
      'SecurityAlertsPageReference',
      {
        id: '1',
        type: 'SecurityAlertsPage',
      } as ContentReference,
    ],
  ])(
    "Renders correct component for '%s'",
    async (testId: string, contentReference: ContentReference) => {
      const resolvedContentReferenceNode: ResolvedContentReferenceNode<ContentReference> = {
        contentReferenceId: '1',
        contentReferenceCount: 1,
        contentReferenceBlock: '{reference(123)}',
        contentReference,
        type: 'contentReference',
      };

      render(
        <ContentReferenceComponentFactory
          contentReferencesVisible
          contentReferenceNode={resolvedContentReferenceNode}
        />
      );

      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  );

  it('renders nothing when specific contentReferenceNode is invalid', () => {
    const invalidContentReferenceNode: InvalidContentReferenceNode = {
      contentReferenceId: '1',
      contentReferenceCount: undefined,
      contentReferenceBlock: '{reference(123)}',
      contentReference: undefined,
      type: 'contentReference',
    };

    const { container } = render(
      <ContentReferenceComponentFactory
        contentReferencesVisible
        contentReferenceNode={invalidContentReferenceNode}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('[1]')).not.toBeInTheDocument();
  });

  it('renders placeholder if contentReferenceNode is unresolved', () => {
    const unresolvedContentReferenceNode: UnresolvedContentReferenceNode = {
      contentReferenceId: '1',
      contentReferenceCount: 1,
      contentReferenceBlock: '{reference(123)}',
      contentReference: undefined,
      type: 'contentReference',
    };

    render(
      <ContentReferenceComponentFactory
        contentReferencesVisible
        contentReferenceNode={unresolvedContentReferenceNode}
      />
    );

    expect(screen.getByTestId('ContentReferenceButton')).toBeInTheDocument();
    expect(screen.getByText('[1]')).toBeInTheDocument();
  });
});
