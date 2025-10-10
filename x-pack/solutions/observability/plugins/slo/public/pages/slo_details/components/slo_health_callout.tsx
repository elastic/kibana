/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import kbnRison from '@kbn/rison';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { useFetchSloHealth } from '../../../hooks/use_fetch_slo_health';
import { getSloHealthStateText } from '../../../lib/slo_health_helpers';
import { getSLOTransformId, getSLOSummaryTransformId } from '../../../../common/constants';
import { ExternalLinkDisplayText } from './external_link_display_text';
import { SloHealthIssuesList } from '../../slos/components/health_callout/slo_health_issues_list';

export function SloHealthCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const { isLoading, isError, data } = useFetchSloHealth({ list: [slo] });

  const {
    share: {
      url: { locators },
    },
  } = useKibana().services;

  const managementLocator = locators.get(MANAGEMENT_APP_LOCATOR);

  const getUrl = (transformId: string) => {
    return (
      managementLocator?.getRedirectUrl({
        sectionId: 'data',
        appId: `transform?_a=${kbnRison.encode({
          transform: {
            queryText: transformId,
          },
        })}`,
      }) || ''
    );
  };

  const rollupTransformId = useMemo(
    () => getSLOTransformId(slo.id, slo.revision),
    [slo.id, slo.revision]
  );

  const summaryTransformId = useMemo(
    () => getSLOSummaryTransformId(slo.id, slo.revision),
    [slo.id, slo.revision]
  );

  const rollupUrl = getUrl(rollupTransformId);
  const summaryUrl = getUrl(summaryTransformId);

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
            defaultMessage="The following {count, plural, one {transform is} other {transforms are}} in {stateText} state. You can inspect {count, plural, it {one} other {each one}} here:"
            values={{ count, stateText }}
          />
          <ul>
            {health.rollup !== 'healthy' && !!rollupUrl && (
              <li key={`${slo.id}-rollup-unhealthy`}>
                <ExternalLinkDisplayText textSize="s" content={rollupTransformId} url={rollupUrl} />
              </li>
            )}
            {health.summary !== 'healthy' && !!summaryUrl && (
              <ExternalLinkDisplayText textSize="s" content={summaryTransformId} url={summaryUrl} />
            )}
          </ul>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
