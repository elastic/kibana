/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import kbnRison from '@kbn/rison';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { values } from 'lodash';
import React from 'react';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../common/constants';
import { useActionModal } from '../../../context/action_modal';
import { useFetchSloHealth } from '../../../hooks/use_fetch_slo_health';
import { useKibana } from '../../../hooks/use_kibana';
import { ContentWithInspectCta } from './health_callout/content_with_inspect_cta';
import { ContentWithResetCta } from './health_callout/content_with_reset_cta';

export function SloHealthCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const { isLoading, isError, data } = useFetchSloHealth({ list: [slo] });

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

  if (isLoading || isError || data === undefined || data?.length !== 1) {
    return null;
  }

  const health = data[0].health;
  if (health.overall === 'healthy') {
    return null;
  }

  const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
  const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);

  const rollupUrl = getUrl(rollupTransformId);
  const summaryUrl = getUrl(summaryTransformId);

  const rollup = {
    unhealthy: health.rollup.status === 'unhealthy',
    missing: health.rollup.status === 'missing',
    stopped: health.rollup.transformState === 'stopped',
  };
  const summary = {
    unhealthy: health.summary.status === 'unhealthy',
    missing: health.summary.status === 'missing',
    stopped: health.summary.transformState === 'stopped',
  };

  const rollupHasIssue = values(rollup).some(Boolean);
  const summaryHasIssue = values(summary).some(Boolean);
  const count = [rollupHasIssue, summaryHasIssue].filter(Boolean).length;

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
            defaultMessage="The following {count, plural, one {transform is} other {transforms are}} problematic (either missing, stopped or unhealthy). You can inspect {count, plural, it {one} other {each one}} here:"
            values={{ count }}
          />
          <ul>
            {(rollup.unhealthy || rollup.stopped) && !!rollupUrl && (
              <li>
                <ContentWithInspectCta
                  textSize="s"
                  content={
                    rollup.unhealthy
                      ? getUnhealthyText(rollupTransformId)
                      : getStoppedText(rollupTransformId)
                  }
                  url={rollupUrl}
                />
              </li>
            )}
            {rollup.missing && (
              <li>
                <ContentWithResetCta
                  textSize="s"
                  content={getMissingText(rollupTransformId)}
                  handleReset={handleReset}
                />
              </li>
            )}

            {(summary.unhealthy || summary.stopped) && !!summaryUrl && (
              <li>
                <ContentWithInspectCta
                  textSize="s"
                  content={
                    summary.unhealthy
                      ? getUnhealthyText(summaryTransformId)
                      : getStoppedText(summaryTransformId)
                  }
                  url={summaryUrl}
                />
              </li>
            )}
            {summary.missing && (
              <li>
                <ContentWithResetCta
                  textSize="s"
                  content={getMissingText(summaryTransformId)}
                  handleReset={handleReset}
                />
              </li>
            )}
          </ul>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}

const getUnhealthyText = (transformId: string) =>
  i18n.translate('xpack.slo.sloDetails.healthCallout.unhealthyTransformText', {
    defaultMessage: '{transformId} (unhealthy)',
    values: { transformId },
  });

const getStoppedText = (transformId: string) =>
  i18n.translate('xpack.slo.sloDetails.healthCallout.stoppedTransformText', {
    defaultMessage: '{transformId} (stopped)',
    values: { transformId },
  });

const getMissingText = (transformId: string) =>
  i18n.translate('xpack.slo.sloDetails.healthCallout.missingTransformText', {
    defaultMessage: '{transformId} (missing)',
    values: { transformId },
  });
