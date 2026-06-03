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
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QuickLinkPanel } from './quick_link_panel';
import { useKibana } from '../hooks/use_kibana';

interface DocLink {
  title: string;
  href: string;
  telemetryId: string;
}

export const DocumentationQuickLinks = () => {
  const {
    services: { docLinks },
  } = useKibana();

  // Placeholder titles and links are being used here until we have final content
  // TODO: Replace these with the final docs links once vector content is merged
  const DOC_LINKS: DocLink[] = [
    {
      title: i18n.translate('xpack.serverlessVectordb.home.docs.slices.title', {
        defaultMessage: 'Partitioning your vector database with slices',
      }),
      href: docLinks.links.enterpriseSearch.knnSearch,
      telemetryId: 'serverlessVectordb-home-docLink-slices',
    },
    {
      title: i18n.translate('xpack.serverlessVectordb.home.docs.vectorSearch.title', {
        defaultMessage: 'Vector search in Elasticsearch for AI-driven experiences.',
      }),
      href: docLinks.links.enterpriseSearch.knnSearch,
      telemetryId: 'serverlessVectordb-home-docLink-vectorSearch',
    },
    {
      title: i18n.translate('xpack.serverlessVectordb.home.docs.semanticSearch.title', {
        defaultMessage: 'Semantic search and the semantic_text field type',
      }),
      href: docLinks.links.enterpriseSearch.semanticSearch,
      telemetryId: 'serverlessVectordb-home-docLink-semanticSearch',
    },
  ];

  return (
    <div>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h4>
              <EuiTextColor color="subdued">
                {i18n.translate('xpack.serverlessVectordb.home.docs.heading', {
                  defaultMessage: 'Documentation quick links',
                })}
              </EuiTextColor>
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
          <EuiLink
            href={docLinks.links.enterpriseSearch.knnSearch}
            target="_blank"
            external
            rel="noopener noreferrer"
            data-telemetry-id="serverlessVectordb-home-viewDocumentation"
          >
              {i18n.translate('xpack.serverlessVectordb.home.docs.viewAll', {
                defaultMessage: 'View documentation',
              })}
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m">
        {DOC_LINKS.map((link, index) => (
          <EuiFlexItem key={index}>
            <QuickLinkPanel title={link.title} href={link.href} telemetryId={link.telemetryId} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
