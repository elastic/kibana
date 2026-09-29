/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiBadge, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import { useKibana } from '../../../../hooks/use_kibana';
import type { MemoryPage } from './types';

interface LineageCrumb {
  id: string;
  title: string;
  usefulness: number;
  archived: boolean;
}

/**
 * Fetches the whole chain in one request.
 *
 * The server walks `merged_from` breadth-first with a bounded, cycle-safe
 * `mget` per level, so the browser never issues a request per ancestor. The
 * server cap is authoritative — the client cannot ask for an unbounded walk.
 */
const useLineage = (page: MemoryPage | undefined) => {
  const {
    dependencies: {
      start: { nightshiftInvestigations },
    },
  } = useKibana();
  const client = nightshiftInvestigations?.investigationsClient;
  const [crumbs, setCrumbs] = useState<LineageCrumb[]>([]);

  const rootId = page?.id;
  const hasParents = (page?.merged_from?.length ?? 0) > 0;

  // Hold the client in a ref rather than listing it as a dependency. The
  // services object is rebuilt on every render, so depending on it directly
  // re-runs this effect forever — a maximum-update-depth loop.
  const clientRef = useRef(client);
  clientRef.current = client;

  useEffect(() => {
    if (!rootId || !hasParents) {
      setCrumbs([]);
      return;
    }

    let cancelled = false;
    const activeClient = clientRef.current;
    if (!activeClient) {
      return;
    }

    activeClient
      .fetch('GET /internal/nightshift/memory/pages/{id}/lineage', {
        signal: null,
        params: { path: { id: rootId } },
      })
      .then((result) => {
        if (!cancelled) setCrumbs(result.ancestors ?? []);
      })
      .catch(() => {
        // Lineage is supplementary; a failure must not break the page.
        if (!cancelled) setCrumbs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [rootId, hasParents]);

  return crumbs;
};

interface MemoryLineageProps {
  page: MemoryPage | undefined;
  onSelectPage: (id: string) => void;
}

/**
 * The trail of memories this one was merged from.
 *
 * Each ancestor is a real document — the optimizer archives merge sources
 * rather than deleting them — so the chain is navigable all the way back, which
 * is the thing a flat list of source ids cannot do.
 */
export function MemoryLineage({ page, onSelectPage }: MemoryLineageProps) {
  const crumbs = useLineage(page);

  const items = useMemo(
    () =>
      crumbs.map((crumb) => (
        <EuiLink
          key={crumb.id}
          onClick={() => onSelectPage(crumb.id)}
          data-test-subj={`nightshiftMemoryLineageCrumb-${crumb.id}`}
        >
          {crumb.title}
        </EuiLink>
      )),
    [crumbs, onSelectPage]
  );

  if (crumbs.length === 0 || !page) {
    return null;
  }

  return (
    <div
      data-test-subj="nightshiftMemoryLineage"
      className={css`
        margin-bottom: 12px;
      `}
    >
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.significantEventsApp.memory.lineage.heading"
          defaultMessage="Merged from"
        />
      </EuiText>
      <EuiSpacer size="xs" />
      <div
        className={css`
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
        `}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.key}>
            {index > 0 && (
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.significantEventsApp.memory.lineage.separator"
                  defaultMessage="›"
                />
              </EuiText>
            )}
            {item}
            <EuiBadge color="hollow">
              <FormattedMessage
                id="xpack.significantEventsApp.memory.lineage.mergedBadge"
                defaultMessage="merged"
              />
            </EuiBadge>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
