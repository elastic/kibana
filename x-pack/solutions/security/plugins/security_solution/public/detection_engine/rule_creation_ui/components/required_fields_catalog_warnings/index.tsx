/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { useKibana } from '../../../../common/lib/kibana';

const CATALOG_INDEX = '.kibana-data-source-catalog';

interface RequiredFieldsCatalogWarningsProps {
  indexPatterns: string[];
  requiredFields: Array<{ name: string; type: string }>;
}

export const RequiredFieldsCatalogWarnings: React.FC<RequiredFieldsCatalogWarningsProps> = ({
  indexPatterns,
  requiredFields,
}) => {
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const {
    data: { search: searchService },
  } = useKibana().services;

  useEffect(() => {
    if (requiredFields.length === 0 || indexPatterns.length === 0) {
      setMissingFields([]);
      return;
    }

    let cancelled = false;

    const validate = async () => {
      try {
        const missing: string[] = [];

        for (const field of requiredFields) {
          const response = await lastValueFrom(
            searchService.search<
              Record<string, unknown>,
              IKibanaSearchResponse<{
                hits: { total: number | { value: number }; hits: unknown[] };
              }>
            >({
              params: {
                index: CATALOG_INDEX,
                body: {
                  query: {
                    bool: {
                      filter: [
                        { wildcard: { name: { value: indexPatterns[0] } } },
                        {
                          nested: {
                            path: 'mapping.fields',
                            query: { term: { 'mapping.fields.name': field.name } },
                          },
                        },
                      ],
                    },
                  },
                  size: 0,
                },
              },
            })
          );

          const total =
            typeof response?.rawResponse?.hits?.total === 'number'
              ? response.rawResponse.hits.total
              : response?.rawResponse?.hits?.total?.value ?? 0;

          if (total === 0) {
            missing.push(field.name);
          }
        }

        if (!cancelled) {
          setMissingFields(missing);
        }
      } catch {
        // Catalog index may not exist yet — no warnings to show
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [searchService, indexPatterns, requiredFields]);

  if (missingFields.length === 0) return null;

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        title="Some required fields may not exist in the selected data sources"
        color="warning"
        iconType="warning"
        size="s"
      >
        <EuiText size="xs">
          <p>
            The following fields were not found in the data source catalog for{' '}
            <strong>{indexPatterns[0]}</strong>:
          </p>
          <ul>
            {missingFields.map((field) => (
              <li key={field}>
                <code>{field}</code>
              </li>
            ))}
          </ul>
          <p>
            This rule may not generate alerts if these fields are missing from the target indices.
          </p>
        </EuiText>
      </EuiCallOut>
    </>
  );
};
