/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import kbnRison from '@kbn/rison';
import { useFetchSloHealth } from '../../../hooks/use_fetch_slo_health';
import { useRepairSlo } from '../../../hooks/use_repair_slo';
import { useKibana } from '../../../hooks/use_kibana';
import { usePermissions } from '../../../hooks/use_permissions';
import { getSLOTransformId, getSLOSummaryTransformId } from '../../../../common/constants';
import { ContentWithInspectCta } from './health_callout/content_with_inspect_cta';

export function SloHealthCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const { isLoading, isError, data } = useFetchSloHealth({ list: [slo] });

  const {
    share: {
      url: { locators },
    },
  } = useKibana().services;

  const { data: permissions } = usePermissions();
  const { mutate: repairSlo } = useRepairSlo({
    name: slo.name,
  });

  const health = data?.[0]?.health;
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
  if (!health) return null;

  const links: Array<{
    transformId: string;
    transformName: string;
    status: string;
    url: string;
  }> = [];

  // Add rollup transform inspect link if unhealthy (not missing)
  if (health.rollup?.status === 'unhealthy') {
    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    links.push({
      transformId: rollupTransformId,
      transformName: rollupTransformId,
      status: health.rollup.status,
      url: getUrl(rollupTransformId),
    });
  }

  // Add summary transform inspect link if unhealthy (not missing)
  if (health.summary?.status === 'unhealthy') {
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    links.push({
      transformId: summaryTransformId,
      transformName: summaryTransformId,
      status: health.summary.status,
      url: getUrl(summaryTransformId),
    });
  }

  if (isLoading || isError || data === undefined || data?.length !== 1) {
    return null;
  }

  if (health?.overall === 'healthy') {
    return null;
  }

  // Show repair button if any transform is missing or is out of sync with SLO
  // Only show if user has edit SLO capabilities
  const showRepairButton =
    !!health &&
    !!permissions?.hasAllWriteRequested &&
    (health?.summary.transformState === 'missing' ||
      health?.rollup.transformState === 'missing' ||
      !health?.rollup.match ||
      !health?.summary.match);

  return (
    <EuiCallOut
      color="danger"
      title={
        <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
          {i18n.translate('xpack.slo.sloDetails.healthCallout.title', {
            defaultMessage: 'This SLO has issues with its transforms',
          })}
          <EuiIconTip
            type="info"
            color="danger"
            content={i18n.translate('xpack.slo.sloDetails.healthCallout.infoTooltip', {
              defaultMessage:
                'When an SLO has problems with transforms, data may not be processed and the SLO may not function properly. Repairing the SLO will attempt to resolve simple issues with transforms automatically. Transforms labeled as "unhealthy" may require manual intervention.',
            })}
          />
        </EuiFlexGroup>
      }
    >
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        {links.length > 0 && (
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
              {links.map(({ transformId, transformName, status, url }) => (
                <EuiFlexItem key={transformId}>
                  <ContentWithInspectCta
                    url={url}
                    textSize="s"
                    content={`${transformName} (${status})`}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        {showRepairButton && (
          <EuiFlexItem>
            <EuiButton
              data-test-subj="sloSloHealthCalloutRepairButton"
              iconSide="left"
              iconType={'wrench'}
              color="accent"
              onClick={() =>
                repairSlo({
                  list: [{ id: slo.id, instanceId: slo.instanceId, enabled: slo.enabled }],
                })
              }
            >
              {i18n.translate('xpack.slo.sloDetails.sloHealthCallout.repairButtonLabel', {
                defaultMessage: 'Repair',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
