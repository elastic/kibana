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
import { useActionModal } from '../../../context/action_modal';
import { getSLOTransformId, getSLOSummaryTransformId } from '../../../../common/constants';
import { ContentWithResetCta } from './health_callout/content_with_reset_cta';
import { ContentWithInspectCta } from './health_callout/content_with_inspect_cta';

export function SloHealthCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const { isLoading, isError, data: resultData } = useFetchSloHealth({ list: [slo] });
  const { data } = resultData ?? {};

  const {
    share: {
      url: { locators },
    },
  } = useKibana().services;
  const { triggerAction } = useActionModal();

  const handleReset = () => {
    triggerAction({
      type: 'reset',
      item: slo,
    });
  };

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

  const unhealthyRollup = health.rollup.status === 'unhealthy';
  const unhealthySummary = health.summary.status === 'unhealthy';
  const missingRollup = health.rollup.status === 'missing';
  const missingSummary = health.summary.status === 'missing';
  const improperlyStoppedRollup = health.enabled && health.rollup.transformState === 'stopped';
  const improperlyStoppedSummary = health.enabled && health.summary.transformState === 'stopped';
  const improperlyStartedRollup = !health.enabled && health.rollup.transformState === 'started';
  const improperlyStartedSummary = !health.enabled && health.summary.transformState === 'started';

  const unhealthyRollupContent = `${rollupTransformId} (unhealthy)`;
  const unhealthySummaryContent = `${summaryTransformId} (unhealthy)`;
  const missingRollupContent = `${rollupTransformId} (missing)`;
  const missingSummaryContent = `${summaryTransformId} (missing)`;
  const improperlyStoppedRollupContent = `${rollupTransformId} (stopped)`;
  const improperlyStoppedSummaryContent = `${summaryTransformId} (stopped)`;
  const improperlyStartedRollupContent = `${rollupTransformId} (running)`;
  const improperlyStartedSummaryContent = `${summaryTransformId} (running)`;

  const calloutContentMap = {
    [`${slo.id}-rollup-unhealthy`]: {
      content: unhealthyRollupContent,
      show: unhealthyRollup && !!rollupUrl,
      url: rollupUrl,
    },
    [`${slo.id}-summary-unhealthy`]: {
      content: unhealthySummaryContent,
      show: unhealthySummary && !!summaryUrl,
      url: summaryUrl,
    },
    [`${slo.id}-rollup-missing`]: {
      content: missingRollupContent,
      show: missingRollup,
    },
    [`${slo.id}-summary-missing`]: {
      content: missingSummaryContent,
      show: missingSummary,
    },
    [`${slo.id}-rollup-stopped`]: {
      content: improperlyStoppedRollupContent,
      show: improperlyStoppedRollup,
      url: rollupUrl,
    },
    [`${slo.id}-summary-stopped`]: {
      content: improperlyStoppedSummaryContent,
      show: improperlyStoppedSummary,
      url: summaryUrl,
    },
    [`${slo.id}-rollup-running`]: {
      content: improperlyStartedRollupContent,
      show: improperlyStartedRollup,
      url: rollupUrl,
    },
    [`${slo.id}-summary-running`]: {
      content: improperlyStartedSummaryContent,
      show: improperlyStartedSummary,
      url: summaryUrl,
    },
  };

  const count = Object.values(calloutContentMap).filter((item) => item.show).length;

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
            defaultMessage="The following {count, plural, one {transform is} other {transforms are}} in a broken state. You can inspect {count, plural, it {one} other {each one}} here:"
            values={{ count }}
          />
          <ul>
            {Object.entries(calloutContentMap).map(([key, value]) =>
              value.show ? (
                <li key={key}>
                  {value.url ? (
                    <ContentWithInspectCta textSize="xs" content={value.content} url={value.url} />
                  ) : (
                    <ContentWithResetCta
                      textSize="xs"
                      content={value.content}
                      handleReset={handleReset}
                    />
                  )}
                </li>
              ) : null
            )}
          </ul>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
