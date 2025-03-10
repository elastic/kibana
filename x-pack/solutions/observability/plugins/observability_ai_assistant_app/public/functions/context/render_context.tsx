/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiLink,
  useEuiTheme,
  EuiToolTip,
  EuiPanel,
} from '@elastic/eui';
import type { DocSearchResult } from '@kbn/product-doc-base-plugin/server';
import { orderBy } from 'lodash';
import { css } from '@emotion/css';
import type {
  ContextEntry,
  ContextToolResponse,
} from '@kbn/observability-ai-assistant-plugin/server';
import { IBasePath } from '@kbn/core/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { useKibana } from '../../hooks/use_kibana';

interface ContextItem {
  id: string;
  title?: string;
  snippet: string;
  url?: string;
  icon: string;
  score: number | null;
  selected: boolean;
}

function truncate(text: string) {
  if (text.length > 100) {
    return `${text.substr(0, 100)}...`;
  }
  return text;
}

async function getItemProps({
  entry,
  connectorIcons,
  basePath,
  hasConnectorsUI,
  discoverLocator,
}: {
  entry: ContextEntry;
  connectorIcons: Map<string, string>;
  basePath: IBasePath;
  hasConnectorsUI: boolean;
  discoverLocator?: DiscoverStart['locator'];
}) {
  if ('product_documentation' in entry.source) {
    const document = entry.document as DocSearchResult;
    return {
      url: document.url,
      icon: 'logoElastic',
    };
  }
  if ('internal' in entry.source) {
    return {
      url: basePath.prepend(
        `/app/management/kibana/observabilityAiAssistantManagement?tab=knowledge_base`
      ),
      icon: 'sparkles',
    };
  }
  if ('connector' in entry.source) {
    const icon = connectorIcons.get(entry.source.connector.service_type) ?? 'logoElasticsearch';
    return {
      url: hasConnectorsUI
        ? basePath.prepend(
            `/app/elasticsearch/content/connectors/${entry.source.connector.id}/documents`
          )
        : await discoverLocator?.getUrl({}),
      icon,
    };
  }
  return {
    icon: 'document',
    url: await discoverLocator?.getUrl({}),
  };
}

function RenderContextItems({ items }: { items: ContextItem[] }) {
  const [highlightedItemId, setHighlightedItemId] = useState<string | undefined>();

  const highlighted = items.find((item) => item.id === highlightedItemId) ?? items[0];

  const theme = useEuiTheme();

  let highlightedDisplay: React.ReactNode;

  const {
    services: {
      http: { basePath },
    },
  } = useKibana();

  if (highlighted) {
    const label = (
      <EuiText
        size="xs"
        className={css`
          display: inline;
        `}
      >
        {highlighted.title}
      </EuiText>
    );

    if (highlighted.url) {
      const isExternalUrl = !highlighted.url.includes(basePath.get());

      highlightedDisplay = (
        <EuiLink
          data-test-subj="observabilityAiAssistantAppRenderContextItemsLink"
          href={highlighted.url}
          {...(isExternalUrl
            ? {
                target: '_blank',
              }
            : {})}
        >
          {label}
        </EuiLink>
      );
    } else {
      highlightedDisplay = label;
    }
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      alignItems="stretch"
      onMouseLeave={() => {
        setHighlightedItemId(undefined);
      }}
    >
      <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
        {items.map((item) => {
          return (
            <EuiFlexItem
              grow={false}
              key={item.id}
              className={css`
                padding-bottom: 4px;
                border-bottom: ${item.id === highlighted?.id
                  ? `2px solid ${theme.euiTheme.border.color}`
                  : 'none'};
              `}
            >
              <EuiToolTip content={item.snippet}>
                <EuiIcon
                  type={item.icon}
                  className={css`
                    opacity: ${item.selected || item.id === highlighted?.id ? 1 : 0.25} !important;
                  `}
                  onMouseEnter={() => {
                    setHighlightedItemId(item.id);
                  }}
                />
              </EuiToolTip>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      <EuiFlexGroup direction="row">{highlightedDisplay}</EuiFlexGroup>
    </EuiFlexGroup>
  );
}

export function RenderContext({
  response,
  connectorIcons,
}: {
  response: ContextToolResponse;
  connectorIcons: Map<string, string>;
}) {
  const {
    services: {
      http: { basePath },
      plugins: {
        start: { discover },
      },
    },
  } = useKibana();

  const [items, setItems] = useState<ContextItem[]>();

  useEffect(() => {
    if (typeof response.content === 'string') {
      return;
    }

    if ('suggestions' in response.data) {
      const selectedIds =
        'learnings' in response.content
          ? response.content.learnings.map((learning) => learning.id)
          : [];

      setItems(
        response.data.suggestions.map((suggestion) => {
          return {
            id: suggestion.id,
            selected: selectedIds.includes(suggestion.id),
            score: suggestion.score,
            icon: 'document',
            snippet: truncate(suggestion.text),
            title: undefined,
            url: undefined,
          };
        })
      );
    }

    if ('entries' in response.data) {
      const selectedIds =
        'entries' in response.content ? response.content.entries.map((entry) => entry.id) : [];

      Promise.all(
        response.data.entries.map(async (entry) => ({
          ...(await getItemProps({
            entry,
            connectorIcons,
            basePath,
            discoverLocator: discover.locator,
            hasConnectorsUI: true,
          })),
          title: entry.title,
          id: entry.id,
          selected: selectedIds.includes(entry.id),
          snippet: truncate(entry.text),
          score: entry.llmScore,
        }))
      ).then((mappedItems) => setItems(mappedItems));
    }
  }, [response, connectorIcons, discover.locator, basePath]);

  const sortedItems = useMemo(() => {
    return orderBy(items, (item) => item.score || 0, 'desc');
  }, [items]);

  if (typeof response.content === 'string') {
    return <></>;
  }
  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
      <RenderContextItems items={sortedItems} />
    </EuiPanel>
  );
}
