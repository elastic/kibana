/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DocsLink } from '../types';

export interface DocsLinksSectionProps {
  items: readonly DocsLink[];
}

/** Bordered panel of host-provided documentation and support links. */
export const DocsLinksSection = ({ items }: DocsLinksSectionProps) => {
  const labelPrefix = useGeneratedHtmlId({ prefix: 'addDataDocsLink' });

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l" data-test-subj="addDataDocsLinks">
      <EuiFlexGroup gutterSize="xl">
        {items.map((item) => (
          <EuiFlexItem key={item.id} role="group" aria-labelledby={`${labelPrefix}_${item.id}`}>
            {item.icon}
            <EuiSpacer size="m" />
            <EuiText size="s">
              <strong id={`${labelPrefix}_${item.id}`}>{item.title}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              <p>{item.description}</p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiText size="xs">
              <p>
                <EuiLink
                  href={item.href}
                  target="_blank"
                  external
                  aria-label={item.linkAriaLabel}
                  data-test-subj={item['data-test-subj']}
                >
                  {item.linkLabel}
                </EuiLink>
              </p>
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
