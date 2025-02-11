/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductDocumentationContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';

interface Props {
  contentReferenceNode: ContentReferenceNode;
  productDocumentationContentReference: ProductDocumentationContentReference;
}

export const ProductDocumentationReference: React.FC<Props> = ({
  contentReferenceNode,
  productDocumentationContentReference,
}) => {
  return (
    <PopoverReference
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
      data-test-subj="ProductDocumentationReference"
    >
      <EuiLink href={productDocumentationContentReference.url} target="_blank">
        {productDocumentationContentReference.title}
      </EuiLink>
    </PopoverReference>
  );
};
