/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentReferences } from '@kbn/elastic-assistant-common';
import React from 'react';
import type { ContentReferenceNode } from '../content_reference_parser';
import { KnowledgeBaseEntryReference } from './knowledge_base_entry_reference';
import { SecurityAlertReference } from './security_alert_reference';
import { SecurityAlertsPageReference } from './security_alerts_page_reference';
import { ContentReferenceButton } from './content_reference_button';
import { ProductDocumentationReference } from './product_documentation_reference';
import { EsqlQueryReference } from './esql_query_reference';

export interface ContentReferenceComponentFactory {
  contentReferences?: ContentReferences;
  contentReferencesVisible: boolean;
  loading: boolean;
}

export const contentReferenceComponentFactory = ({
  contentReferences,
  contentReferencesVisible,
  loading,
}: ContentReferenceComponentFactory) => {
  const ContentReferenceComponent = (
    contentReferenceNode: ContentReferenceNode
  ): React.ReactNode => {
    if (!contentReferencesVisible) return null;

    const defaultNode = (
      <ContentReferenceButton
        disabled
        contentReferenceCount={contentReferenceNode.contentReferenceCount}
      />
    );

    if (!contentReferences && loading) return defaultNode;

    const contentReference = contentReferences?.[contentReferenceNode.contentReferenceId];

    if (!contentReference) return null;

    switch (contentReference.type) {
      case 'KnowledgeBaseEntry':
        return (
          <KnowledgeBaseEntryReference
            contentReferenceNode={contentReferenceNode}
            knowledgeBaseEntryContentReference={contentReference}
          />
        );
      case 'SecurityAlert':
        return (
          <SecurityAlertReference
            contentReferenceNode={contentReferenceNode}
            securityAlertContentReference={contentReference}
          />
        );
      case 'SecurityAlertsPage':
        return (
          <SecurityAlertsPageReference
            contentReferenceNode={contentReferenceNode}
            securityAlertsPageContentReference={contentReference}
          />
        );
      case 'ProductDocumentation':
        return (
          <ProductDocumentationReference
            contentReferenceNode={contentReferenceNode}
            productDocumentationContentReference={contentReference}
          />
        );
      case 'EsqlQuery':
        return (
          <EsqlQueryReference
            contentReferenceNode={contentReferenceNode}
            esqlContentReference={contentReference}
          />
        );
      default:
        return defaultNode;
    }
  };

  ContentReferenceComponent.displayName = 'ContentReferenceComponent';

  return ContentReferenceComponent;
};
