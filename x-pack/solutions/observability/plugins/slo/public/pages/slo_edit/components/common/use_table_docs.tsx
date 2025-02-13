/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import { FieldPath, useFormContext } from 'react-hook-form';
import { DataView } from '@kbn/data-views-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { QuerySchema } from '@kbn/slo-schema';
import { getElasticsearchQueryOrThrow } from '../../../../../common/parse_kuery';
import { CreateSLOForm } from '../../types';

export const useTableDocs = ({
  sampleSize,
  name,
  dataView,
  range,
}: {
  range: TimeRange;
  dataView: DataView;
  sampleSize: number;
  name: FieldPath<CreateSLOForm>;
}) => {
  const { getFieldState, watch } = useFormContext<CreateSLOForm>();
  const errorMessages = getFieldState(name).error?.message;
  const filter = watch(name) as QuerySchema;

  const esFilter = getElasticsearchQueryOrThrow(filter);

  const { data, loading, error } = useEsSearch(
    {
      index: !errorMessages ? dataView.getIndexPattern() : '',
      size: sampleSize,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: range.from,
                  lte: range.to,
                },
              },
            },
            esFilter,
          ],
        },
      },
    },
    [range.from, range.to, dataView, JSON.stringify(filter), sampleSize, errorMessages],
    {
      name: 'slo-edit-documents-table',
    }
  );
  return { data, loading, error };
};
