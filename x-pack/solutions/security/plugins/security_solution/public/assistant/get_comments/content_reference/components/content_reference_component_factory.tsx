import { ContentReferences } from '@kbn/elastic-assistant-common';
import React from 'react';
import { ContentReferenceNode } from '../content_reference_parser';
import { KnowledgeBaseEntryReference } from './knowledge_base_entry_reference';
import { SecurityAlertReference } from './security_alert_reference';
import { SecurityAlertsPageReference } from './security_alert_page_reference';
import { ContentReferenceButton } from './content_reference_button';
import { ProductDocumentationReference } from './product_documentation_reference';

type ContentReferenceComponentFactory = {
  contentReferences?: ContentReferences
  contentReferencesVisible: boolean
}

export const contentReferenceComponentFactory = ({ contentReferences, contentReferencesVisible }: ContentReferenceComponentFactory) => {
  return (contentReferenceNode: ContentReferenceNode): React.ReactNode => {
    if(!contentReferencesVisible) return null

    const defaultNode = <ContentReferenceButton
      disabled
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
    />

    if (contentReferences == undefined) return defaultNode

    const contentReference = contentReferences[contentReferenceNode.contentReferenceId]

    if (!contentReference == undefined) return defaultNode

    switch (contentReference.type) {
      case "KnowledgeBaseEntry": return <KnowledgeBaseEntryReference contentReferenceNode={contentReferenceNode} knowledgeBaseEntryContentReference={contentReference} />
      case "SecurityAlert": return <SecurityAlertReference contentReferenceNode={contentReferenceNode} securityAlertContentReference={contentReference} />
      case "SecurityAlertsPage": return <SecurityAlertsPageReference contentReferenceNode={contentReferenceNode} securityAlertsPageContentReference={contentReference} />
      case "ProductDocumentation": return <ProductDocumentationReference contentReferenceNode={contentReferenceNode} productDocumentationContentReference={contentReference} />
      default: return defaultNode
    }
  }
}
