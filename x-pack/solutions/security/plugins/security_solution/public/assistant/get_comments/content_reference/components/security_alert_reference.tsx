import { SecurityAlertContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { EuiLink } from '@elastic/eui';

type Props = {
    contentReferenceNode: ContentReferenceNode
    securityAlertContentReference: SecurityAlertContentReference
}

export const SecurityAlertReference: React.FC<Props> = ({ contentReferenceNode, securityAlertContentReference }) => {
    return (
        <PopoverReference contentReferenceCount={contentReferenceNode.contentReferenceCount}>
            <EuiLink href={`/app/security/alerts/redirect/${securityAlertContentReference.alertId}`} target="_blank">
                View alert
            </EuiLink>
        </PopoverReference>
    );
}
