/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { KNOWLEDGE_BASE_ENTRY_REFERENCE_LABEL } from './translations';
import { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';

interface Props {
  contentReferenceNode: ContentReferenceNode;
  esqlContentReference: EsqlContentReference;
}

export const EsqlQueryReference: React.FC<Props> = ({ contentReferenceNode, esqlContentReference }) => {
    return (
        <PopoverReference contentReferenceCount={contentReferenceNode.contentReferenceCount}>
            <EuiLink href={`http://localhost:5601/app/discover#/?_a=(dataSource:(type:esql),interval:auto,query:(esql:'${encodeURIComponent(esqlContentReference.query)}'))`} target="_blank">
                View Docs
            </EuiLink>
        </PopoverReference>
    );
}
