import { KnowledgeBaseEntryContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { EuiLink } from '@elastic/eui';
import { KNOWLEDGE_BASE_ENTRY_REFERENCE_LABEL } from './translations';

type Props = {
    contentReferenceNode: ContentReferenceNode
    knowledgeBaseEntryContentReference: KnowledgeBaseEntryContentReference
}

export const KnowledgeBaseEntryReference: React.FC<Props> = ({ contentReferenceNode, knowledgeBaseEntryContentReference }) => {
    return (
        <PopoverReference contentReferenceCount={contentReferenceNode.contentReferenceCount}>
            <EuiLink href={`/app/management/kibana/securityAiAssistantManagement?tab=knowledge_base&entry_search_term=${knowledgeBaseEntryContentReference.knowledgeBaseEntryId}`} target="_blank">
                {`${KNOWLEDGE_BASE_ENTRY_REFERENCE_LABEL}: ${knowledgeBaseEntryContentReference.knowledgeBaseEntryName}`}
            </EuiLink>
        </PopoverReference>
    );
}
