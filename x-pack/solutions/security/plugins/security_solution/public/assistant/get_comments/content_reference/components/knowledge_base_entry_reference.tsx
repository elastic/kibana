/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeBaseEntryContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { KNOWLEDGE_BASE_ENTRY_REFERENCE_LABEL } from './translations';
import type { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';

interface Props {
  contentReferenceNode: ContentReferenceNode;
  knowledgeBaseEntryContentReference: KnowledgeBaseEntryContentReference;
}

export const KnowledgeBaseEntryReference: React.FC<Props> = ({
  contentReferenceNode,
  knowledgeBaseEntryContentReference,
}) => {
  return (
    <PopoverReference contentReferenceCount={contentReferenceNode.contentReferenceCount} data-test-subj='KnowledgeBaseEntryReference'>
      <EuiLink
        href={`/app/management/kibana/securityAiAssistantManagement?tab=knowledge_base&entry_search_term=${knowledgeBaseEntryContentReference.knowledgeBaseEntryId}`}
        target="_blank"
      >
        {`${KNOWLEDGE_BASE_ENTRY_REFERENCE_LABEL}: ${knowledgeBaseEntryContentReference.knowledgeBaseEntryName}`}
      </EuiLink>
    </PopoverReference>
  );
};
