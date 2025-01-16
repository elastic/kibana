import { SecurityAlertsPageContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { EuiLink } from '@elastic/eui';
import { SECURITY_ALERTS_PAGE_REFERENCE_LABEL } from './translations';

type Props = {
    contentReferenceNode: ContentReferenceNode
    securityAlertsPageContentReference: SecurityAlertsPageContentReference
}

export const SecurityAlertsPageReference: React.FC<Props> = ({ contentReferenceNode }) => {
    return (
        <PopoverReference contentReferenceCount={contentReferenceNode.contentReferenceCount}>
            <EuiLink href={`/app/security/alerts`} target="_blank">
                {SECURITY_ALERTS_PAGE_REFERENCE_LABEL}
            </EuiLink>
        </PopoverReference>
    );
}
