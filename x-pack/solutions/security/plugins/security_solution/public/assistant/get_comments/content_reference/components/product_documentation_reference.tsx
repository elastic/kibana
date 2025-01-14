import { ProductDocumentationContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { EuiLink } from '@elastic/eui';

type Props = {
    contentReferenceNode: ContentReferenceNode
    productDocumentationContentReference: ProductDocumentationContentReference
}

export const ProductDocumentationReference: React.FC<Props> = ({ contentReferenceNode, productDocumentationContentReference }) => {
    return (
        <PopoverReference contentReferenceCount={contentReferenceNode.contentReferenceCount}>
            <EuiLink href={productDocumentationContentReference.url} target="_blank">
                {productDocumentationContentReference.title}
            </EuiLink>
        </PopoverReference>
    );
}