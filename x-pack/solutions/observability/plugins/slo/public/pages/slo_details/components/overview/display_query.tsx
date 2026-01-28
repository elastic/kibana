/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n-react';
import type { QuerySchema } from '@kbn/slo-schema';
import { FilterItem } from '@kbn/unified-search-plugin/public';
import React from 'react';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { useKibana } from '../../../../hooks/use_kibana';

const FilterItemI18n = injectI18n(FilterItem);

export function DisplayQuery({ query, index }: { query?: QuerySchema; index: string }) {
  const { dataView } = useCreateDataView({
    indexPatternString: index,
  });

  const { docLinks, uiSettings } = useKibana().services;

  if (typeof query === 'string' || !query) {
    return query ? (
      <EuiCodeBlock
        language="json"
        paddingSize="m"
        fontSize="s"
        isCopyable
        style={{ maxWidth: '100%' }}
      >
        {query}
      </EuiCodeBlock>
    ) : (
      <>*</>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {query.kqlQuery && (
        <EuiFlexItem grow={false}>
          <EuiCodeBlock
            language="kql"
            paddingSize="m"
            fontSize="s"
            isCopyable
            style={{ maxWidth: '100%' }}
          >
            {query.kqlQuery}
          </EuiCodeBlock>
        </EuiFlexItem>
      )}

      {dataView && query.filters && query.filters.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" wrap={true}>
            {query.filters.map((filter, idx) => (
              <EuiFlexItem key={idx} grow={false}>
                <FilterItemI18n
                  id={'filter-id' + idx}
                  filter={filter}
                  indexPatterns={[dataView]}
                  onUpdate={() => {}}
                  onRemove={() => {}}
                  docLinks={docLinks}
                  uiSettings={uiSettings}
                  readOnly={true}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
