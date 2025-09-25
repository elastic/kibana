/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useFetchSloHealth } from '../../../hooks/use_fetch_slo_health';
import { useKibana } from '../../../hooks/use_kibana';
import { getSloHealthStateText } from '../../../lib/slo_health_helpers';
import { SloHealthIssuesList } from '../../slos/components/health_callout/slo_health_issues_list';

export function SloHealthCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const { http } = useKibana().services;
  const { isLoading, isError, data } = useFetchSloHealth({ list: [slo] });

  if (isLoading || isError || data === undefined || data?.length !== 1) {
    return null;
  }

  const health = data[0].health;
  if (health.overall === 'healthy') {
    return null;
  }

  const unhealthyRollup = health.rollup === 'unhealthy';
  const unhealthySummary = health.summary === 'unhealthy';
  const missingRollup = health.rollup === 'missing';
  const missingSummary = health.summary === 'missing';

  const count = [unhealthyRollup, unhealthySummary, missingRollup, missingSummary].filter(
    Boolean
  ).length;

  const stateText = getSloHealthStateText(
    unhealthyRollup || unhealthySummary,
    missingRollup || missingSummary
  );

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
            defaultMessage="The following {count, plural, one {transform is} other {transforms are}} in {stateText} state:"
            values={{ count, stateText }}
          />
          <SloHealthIssuesList results={data} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="sloSloHealthCalloutInspectTransformButton"
            color="danger"
            fill
            href={http?.basePath.prepend('/app/management/data/transform')}
          >
            <FormattedMessage
              id="xpack.slo.sloDetails.healthCallout.buttonTransformLabel"
              defaultMessage="Inspect transform"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
