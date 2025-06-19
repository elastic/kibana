/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';

export const EntityTable = ({
  dashboardId,
  entityType,
}: {
  dashboardId: string;
  entityType: string;
}) => {
  const {
    services: { data },
  } = useKibanaContextForPlugin();

  const requestData = useCallback(async () => {
    const entities = await lastValueFrom(
      data.search.search<{}, IKibanaSearchResponse>({
        params: {
          index: 'metrics-*',
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      'data_stream.dataset': ['kubernetes.pod', entityType],
                    },
                  },
                ],
              },
            },
            aggs: {
              entities: {
                terms: {
                  field: 'kubernetes.pod.name',
                  size: 1000,
                },
              },
            },
          },
        },
      })
    );
  }, [data, entityType]);

  useEffect(() => {
    requestData();
  }, [requestData]);

  // Placeholder for any hooks or context you might need
  return (
    <div>
      <h2>
        {i18n.translate('xpack.infra.entityTable.h2.entityTableLabel', {
          defaultMessage: 'Entity Table',
        })}
      </h2>
      <p>
        {i18n.translate('xpack.infra.entityTable.p.thisIsAPlaceholderLabel', {
          defaultMessage: 'This is a placeholder for the Entity Table component.',
        })}
      </p>
    </div>
  );
};
