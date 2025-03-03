/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeBaseEntryContentReference } from '@kbn/elastic-assistant-common';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { KNOWLEDGE_BASE_ENTRY_REFERENCE_LABEL } from './translations';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { useKibana } from '../../../../common/lib/kibana';

interface Props {
  contentReferenceNode: ResolvedContentReferenceNode<KnowledgeBaseEntryContentReference>;
}

export const KnowledgeBaseEntryReference: React.FC<Props> = ({ contentReferenceNode }) => {
  const { navigateToApp } = useKibana().services.application;

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      navigateToApp('management', {
        path: `kibana/securityAiAssistantManagement?tab=knowledge_base&entry_search_term=${contentReferenceNode.contentReference.knowledgeBaseEntryId}`,
        openInNewTab: true,
      });
    },
    [navigateToApp, contentReferenceNode]
  );

  return (
    <PopoverReference
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
      data-test-subj="KnowledgeBaseEntryReference"
    >
      <EuiLink onClick={onClick}>
        {`${KNOWLEDGE_BASE_ENTRY_REFERENCE_LABEL}: ${contentReferenceNode.contentReference.knowledgeBaseEntryName}`}
      </EuiLink>
    </PopoverReference>
  );
};
