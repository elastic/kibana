/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HrefContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { EuiLink, euiTextTruncate } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';

interface Props {
  contentReferenceNode: ResolvedContentReferenceNode<HrefContentReference>;
}

export const HrefReference: React.FC<Props> = ({ contentReferenceNode }) => {
  return (
    <PopoverReference
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
      data-test-subj="HrefReference"
    >
      <EuiLink
        href={contentReferenceNode.contentReference.href}
        target="_blank"
        css={css`
          ${euiTextTruncate(`300px`)}
        `}
      >
        {contentReferenceNode.contentReference.label ?? contentReferenceNode.contentReference.href}
      </EuiLink>
    </PopoverReference>
  );
};
