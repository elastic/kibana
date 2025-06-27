/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EnrichedEntityDefinitionsResponse } from '@kbn/observability-navigation-plugin/public';
import { LensWrapper } from '../../../../../components/lens/lens_wrapper';
import type { UseLensAttributesParams } from '../../../../../hooks/use_lens_attributes';
import { useLensAttributes } from '../../../../../hooks/use_lens_attributes';
import { useDatePickerContext } from '../../hooks/use_date_picker';

const getLensAttributesParams = (
  entityDefinition: EnrichedEntityDefinitionsResponse
): UseLensAttributesParams => {
  const where = entityDefinition.attributes
    .map((attribute) => {
      return `${attribute} IS NOT NULL`;
    })
    .join(' AND ');

  const keep = entityDefinition.attributes
    .map((attribute) => {
      return attribute;
    })
    .join(', ');

  const query = `FROM metrics-* | WHERE ${where} | LIMIT 1000 | STATS c = count(*) BY ${keep}`;

  return {
    chartType: 'table',
    dataset: {
      esql: query,
    },
    title: entityDefinition.name,
    metrics: [
      {
        value: 'c',
        format: 'percent',
        decimals: 2,
      },
    ],
    rows: entityDefinition.attributes.map((attribute) => ({
      field: attribute,
    })),
  };
};
export const EntityTableContent = ({
  entityDefinition,
}: {
  entityDefinition: EnrichedEntityDefinitionsResponse;
}) => {
  const { dateRange } = useDatePickerContext();
  const { from, to } = dateRange;

  const params = useMemo(() => getLensAttributesParams(entityDefinition), [entityDefinition]);

  const { attributes } = useLensAttributes(params);

  return (
    <div>
      <LensWrapper attributes={attributes} dateRange={{ from, to }} loading={!attributes} />
    </div>
  );
};
