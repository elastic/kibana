/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { parse } from '@kbn/datemath';
import { EuiLink } from '@elastic/eui';
import { appendWhereClauseToESQLQuery } from '@kbn/esql-utils';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useAssetDetailsRedirect } from '../../../../pages/link_to/use_asset_details_redirect';

const DISCOVER_APP_LOCATOR_ID = 'DISCOVER_APP_LOCATOR';

/** Fallback index pattern when infrastructure metric indices are not available. */
const DEFAULT_METRICS_INDEX = 'metrics-*';

type ExtractStrict<T, U extends T> = Extract<T, U>;
type NodeTypeForLink = ExtractStrict<InventoryItemType, 'host' | 'container' | 'pod'>;

interface MetricsNodeDetailsLinkProps {
  id: string;
  label: string;
  nodeType: NodeTypeForLink;
  timerange: { from: string; to: string };
  isOtel?: boolean;
  /** Infrastructure/metrics index pattern from settings; used for Discover ES|QL when isOtel is true. */
  metricsIndices?: string;
}

/** Escape index pattern for use inside an ES|QL double-quoted string. */
function escapeEsqlStringLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Build an ES|QL query string that filters by the given node type and entity id.
 * Uses @kbn/esql-utils for safe WHERE clause appending (escaping and parsing).
 */
function getDiscoverEsqlQueryForNode(
  nodeType: NodeTypeForLink,
  entityId: string,
  indexPattern: string
): string {
  const from = indexPattern || DEFAULT_METRICS_INDEX;
  const baseQuery = `TS "${escapeEsqlStringLiteral(from)}"`;

  switch (nodeType) {
    case 'container': {
      const withWhere = appendWhereClauseToESQLQuery(
        baseQuery,
        'container.id',
        entityId,
        '+',
        'string'
      );
      return withWhere ?? baseQuery;
    }
    case 'pod': {
      const withWhere = appendWhereClauseToESQLQuery(
        baseQuery,
        'k8s.pod.uid',
        entityId,
        '+',
        'string'
      );
      return withWhere ?? baseQuery;
    }
    default:
      return baseQuery;
  }
}

export const MetricsNodeDetailsLink = ({
  id,
  label,
  nodeType,
  timerange,
  isOtel,
  metricsIndices,
}: MetricsNodeDetailsLinkProps) => {
  const { share } = useKibanaContextForPlugin().services;
  const { getAssetDetailUrl } = useAssetDetailsRedirect();


  const redirectToDiscover = isOtel && nodeType !== 'host';

  const linkProps = useMemo(() => {
    if (redirectToDiscover) {
      const discoverLocator = share?.url?.locators?.get(DISCOVER_APP_LOCATOR_ID);
      const esqlQuery = getDiscoverEsqlQueryForNode(
        nodeType,
        id,
        metricsIndices ?? DEFAULT_METRICS_INDEX
      );
      const discoverParams = {
        timeRange: { from: timerange.from, to: timerange.to },
        query: {
          esql: esqlQuery,
        },
      };
      const href = discoverLocator?.getRedirectUrl(discoverParams) ?? '#';
      return {
        href,
        onClick: (e: React.MouseEvent) => {
          if (discoverLocator) {
            e.preventDefault();
            discoverLocator.navigate(discoverParams);
          }
        },
      };
    }

    const assetDetails = getAssetDetailUrl({
      assetType: nodeType,
      assetId: id,
      search: {
        name: label,
        from: parse(timerange.from)?.valueOf(),
        to: parse(timerange.to)?.valueOf(),
      },
    });
    return { href: assetDetails.href, onClick: assetDetails.onClick };
  }, [
    redirectToDiscover,
    share?.url?.locators,
    timerange.from,
    timerange.to,
    nodeType,
    id,
    label,
    isOtel,
    metricsIndices,
    getAssetDetailUrl,
  ]);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click -- onClick for programmatic navigation; href for "Open in new tab" and fallback
    <EuiLink
      data-test-subj="infraMetricsNodeDetailsLinkLink"
      href={linkProps.href}
      onClick={linkProps.onClick}
    >
      {label}
    </EuiLink>
  );
};
