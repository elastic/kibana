/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionListDescription, EuiDescriptionListTitle, EuiLink } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMemoryClient } from './use_memory';
import type { MemoryPage } from './types';

interface MergeSource {
  id: string;
  title: string;
}

/**
 * The memories a page was merged from, in one request.
 *
 * The server reads the page's own `merged_from` and reports the sources that
 * still exist, so the browser never issues a request per source.
 */
const useMergeSources = (page: MemoryPage): MergeSource[] => {
  const client = useMemoryClient();
  const id = page.id;
  const hasParents = (page.merged_from?.length ?? 0) > 0;

  const { data } = useQuery({
    queryKey: ['nightshift', 'memory', 'lineage', id],
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/memory/pages/{id}/lineage', {
        signal: signal ?? null,
        params: { path: { id } },
      }) as Promise<{ sources?: MergeSource[] }>,
    enabled: client !== undefined && hasParents,
    // Provenance is supplementary: a failure must not break the page, and
    // nothing on it is worth retrying.
    retry: false,
  });

  return data?.sources ?? [];
};

interface MemoryMergedFromRowProps {
  page: MemoryPage;
  onSelectPage: (id: string) => void;
}

/**
 * The memories this one was merged from, as links to them.
 *
 * Only the direct sources: each is a memory of its own, so the page can point at
 * them and leave the reader to follow the chain, rather than flattening several
 * levels of `merged_from` into one trail that reads as a single line of ancestry.
 */
export function MemoryMergedFromRow({ page, onSelectPage }: MemoryMergedFromRowProps) {
  const sources = useMergeSources(page);

  if (sources.length === 0) {
    return null;
  }

  return (
    <>
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.significantEventsApp.memory.metadata.mergedFromLabel"
          defaultMessage="Merged from"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription data-test-subj="nightshiftMemoryMergedFrom">
        {sources.map((source, index) => (
          <React.Fragment key={source.id}>
            {index > 0 && ', '}
            <EuiLink
              onClick={() => onSelectPage(source.id)}
              data-test-subj={`nightshiftMemoryMergedFrom-${source.id}`}
            >
              {source.title}
            </EuiLink>
          </React.Fragment>
        ))}
      </EuiDescriptionListDescription>
    </>
  );
}
