/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductDocumentationContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';

interface Props {
  contentReferenceNode: ResolvedContentReferenceNode<ProductDocumentationContentReference>;
}

export const ProductDocumentationReference: React.FC<Props> = ({ contentReferenceNode }) => {
  return (
    <PopoverReference
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
      data-test-subj="ProductDocumentationReference"
    >
      <EuiLink href={contentReferenceNode.contentReference.url} target="_blank">
        {contentReferenceNode.contentReference.title}
      </EuiLink>
    </PopoverReference>
  );
};
