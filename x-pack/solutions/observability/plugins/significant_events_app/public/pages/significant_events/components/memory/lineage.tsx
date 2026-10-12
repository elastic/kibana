/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMemoryClient } from './use_memory';
import type { MemoryPage } from './types';

interface MergeSource {
  id: string;
  title: string;
}

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
    // Provenance is supplementary: a failure must not break the page.
    retry: false,
  });

  return data?.sources ?? [];
};

interface MemoryMergedFromRowProps {
  page: MemoryPage;
  onSelectPage: (id: string) => void;
}

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
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false} alignItems="flexStart">
          {sources.map((source) => (
            <EuiFlexItem key={source.id} grow={false}>
              <EuiLink
                onClick={() => onSelectPage(source.id)}
                data-test-subj={`nightshiftMemoryMergedFrom-${source.id}`}
              >
                {source.title}
              </EuiLink>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiDescriptionListDescription>
    </>
  );
}
