/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ContentReferences,
  EsqlContentReference,
  KnowledgeBaseEntryContentReference,
  ProductDocumentationContentReference,
  SecurityAlertContentReference,
  SecurityAlertsPageContentReference,
} from '@kbn/elastic-assistant-common';
import React from 'react';
import type {
  ContentReferenceNode,
  ResolvedContentReferenceNode,
} from '../content_reference_parser';
import { KnowledgeBaseEntryReference } from './knowledge_base_entry_reference';
import { SecurityAlertReference } from './security_alert_reference';
import { SecurityAlertsPageReference } from './security_alerts_page_reference';
import { ContentReferenceButton } from './content_reference_button';
import { ProductDocumentationReference } from './product_documentation_reference';
import { EsqlQueryReference } from './esql_query_reference';

/** While a message is being streamed, content references are null. When a message has finished streaming, content references are either defined or undefined */
export type StreamingOrFinalContentReferences = ContentReferences | undefined | null;

export interface Props {
  contentReferencesVisible: boolean;
  contentReferenceNode: ContentReferenceNode;
}

export const ContentReferenceComponentFactory: React.FC<Props> = ({
  contentReferencesVisible,
  contentReferenceNode,
}: Props) => {
  if (!contentReferencesVisible) return null;

  if (contentReferenceNode.contentReferenceCount === undefined) return null;

  if (contentReferenceNode.contentReference === undefined) {
    return (
      <ContentReferenceButton
        disabled
        contentReferenceCount={contentReferenceNode.contentReferenceCount}
      />
    );
  }

  switch (contentReferenceNode.contentReference.type) {
    case 'KnowledgeBaseEntry': {
      return (
        <KnowledgeBaseEntryReference
          contentReferenceNode={
            contentReferenceNode as ResolvedContentReferenceNode<KnowledgeBaseEntryContentReference>
          }
        />
      );
    }
    case 'SecurityAlert':
      return (
        <SecurityAlertReference
          contentReferenceNode={
            contentReferenceNode as ResolvedContentReferenceNode<SecurityAlertContentReference>
          }
        />
      );
    case 'SecurityAlertsPage':
      return (
        <SecurityAlertsPageReference
          contentReferenceNode={
            contentReferenceNode as ResolvedContentReferenceNode<SecurityAlertsPageContentReference>
          }
        />
      );
    case 'ProductDocumentation':
      return (
        <ProductDocumentationReference
          contentReferenceNode={
            contentReferenceNode as ResolvedContentReferenceNode<ProductDocumentationContentReference>
          }
        />
      );
    case 'EsqlQuery': {
      return (
        <EsqlQueryReference
          contentReferenceNode={
            contentReferenceNode as ResolvedContentReferenceNode<EsqlContentReference>
          }
        />
      );
    }
    default:
      return null;
  }
};
