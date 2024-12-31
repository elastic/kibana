/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { QuerySchema } from '@kbn/slo-schema';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FilterItem } from '@kbn/unified-search-plugin/public';
import { injectI18n } from '@kbn/i18n-react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';

const FilterItemI18n = injectI18n(FilterItem);

export function DisplayQuery({ query, index }: { query?: QuerySchema; index: string }) {
  const { dataView } = useCreateDataView({
    indexPatternString: index,
  });

  const { docLinks, uiSettings } = useKibana().services;

  if (typeof query === 'string' || !query) {
    return query ? (
      <EuiCodeBlock language="json" paddingSize="s">
        {query}
      </EuiCodeBlock>
    ) : (
      <>*</>
    );
  }

  return (
    <>
      {query.kqlQuery && (
        <>
          <EuiCodeBlock language="kql" paddingSize="s">
            {query.kqlQuery}
          </EuiCodeBlock>
          <EuiSpacer size="xs" />
        </>
      )}

      {dataView && (
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
      )}
    </>
  );
}
