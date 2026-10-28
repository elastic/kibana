/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QuerySchema } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useFetchGroupByCardinality } from '../../../../hooks/use_fetch_group_by_cardinality';
import type { CreateSLOForm } from '../../types';
import { getGroupKeysProse } from '../../../../utils/slo/groupings';

export function GroupByCardinality({
  titleAppend,
  customFilters,
}: {
  titleAppend?: React.ReactNode;
  customFilters?: QuerySchema;
}) {
  const { control } = useFormContext<CreateSLOForm>();

  const index = useWatch({ control, name: 'indicator.params.index' });
  const filters = useWatch({ control, name: 'indicator.params.filter' });
  const timestampField = useWatch({ control, name: 'indicator.params.timestampField' });
  const groupByField = useWatch({ control, name: 'groupBy' });

  const { isLoading: isGroupByCardinalityLoading, data: groupByCardinality } =
    useFetchGroupByCardinality(index, timestampField, groupByField, customFilters || filters);
  const groupBy = [groupByField].flat().filter((value) => !!value);
  const hasGroupBy = !groupBy.includes(ALL_VALUE) && groupBy.length;

  if (!hasGroupBy) {
    return null;
  }

  if (isGroupByCardinalityLoading && !groupByCardinality) {
    return <KbnInfoCallout announceOnMount size="s" title={<EuiLoadingSpinner />} />;
  }

  if (!groupByCardinality) {
    return null;
  }

  const cardinalityMessage = i18n.translate('xpack.slo.sloEdit.groupBy.cardinalityInfo', {
    defaultMessage:
      'Selected group by field {groupBy} will generate at least {card} SLO instances based on the last 24h sample data.',
    values: {
      card: groupByCardinality.cardinality,
      groupBy: getGroupKeysProse(groupByField),
    },
  });

  const Callout = groupByCardinality.isHighCardinality ? KbnWarningCallout : KbnInfoCallout;

  return (
    <Callout
      size="s"
      title={
        titleAppend ? (
          <>
            {titleAppend} {cardinalityMessage}
          </>
        ) : (
          cardinalityMessage
        )
      }
    />
  );
}
