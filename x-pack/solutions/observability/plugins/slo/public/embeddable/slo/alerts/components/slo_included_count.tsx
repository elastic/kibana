/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFetchSloList } from '../../../../hooks/use_fetch_slo_list';
import { SloItem } from '../types';

export function SloIncludedCount({ slos }: { slos: SloItem[] }) {
  const { data: sloList } = useFetchSloList({
    kqlQuery: slos.map((slo) => `slo.id:${slo.id}`).join(' or '),
    perPage: 0,
  });

  return (
    <FormattedMessage
      id="xpack.slo.sloAlertsWrapper.sLOsIncludedFlexItemLabel.withInstances"
      defaultMessage="{numOfSlos, number} {numOfSlos, plural, one {SLO} other {SLOs}}{instances} included"
      values={{
        numOfSlos: slos.length,
        instances: i18n.translate(
          'xpack.slo.sloAlertsWrapper.sLOsIncludedFlexItemLabel.instancesCount',
          {
            defaultMessage: ' ({count, number} {count, plural, one {Instance} other {Instances}})',
            values: { count: sloList?.total ?? 0 },
          }
        ),
      }}
    />
  );
}
