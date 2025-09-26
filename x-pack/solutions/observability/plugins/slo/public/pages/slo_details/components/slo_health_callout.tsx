/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useMemo } from 'react';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../common/constants';
import { useFetchSloHealth } from '../../../hooks/use_fetch_slo_health';
import { TransformDisplayText } from './unhealthy_transform_display_text';

export function SloHealthCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const { isLoading, isError, data } = useFetchSloHealth({ list: [slo] });

  const rollupTransformId = useMemo(
    () => getSLOTransformId(slo.id, slo.revision),
    [slo.id, slo.revision]
  );

  const summaryTransformId = useMemo(
    () => getSLOSummaryTransformId(slo.id, slo.revision),
    [slo.id, slo.revision]
  );

  if (isLoading || isError || data === undefined || data?.length !== 1) {
    return null;
  }

  const health = data[0].health;
  if (health.overall === 'healthy') {
    return null;
  }

  const count = health.rollup === 'unhealthy' && health.summary === 'unhealthy' ? 2 : 1;

  return (
    <EuiCallOut
      color="danger"
      iconType="warning"
      title={i18n.translate('xpack.slo.sloDetails.healthCallout.title', {
        defaultMessage: 'This SLO has issues with its transforms',
      })}
    >
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem>
          <FormattedMessage
            id="xpack.slo.sloDetails.healthCallout.description"
            defaultMessage="The following {count, plural, one {transform is} other {transforms are}
          } in an unhealthy state:"
            values={{ count }}
          />
          <ul>
            {health.rollup === 'unhealthy' && (
              <TransformDisplayText transformId={rollupTransformId} textSize={'s'} />
            )}
            {health.summary === 'unhealthy' && (
              <TransformDisplayText transformId={summaryTransformId} textSize={'s'} />
            )}
          </ul>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
