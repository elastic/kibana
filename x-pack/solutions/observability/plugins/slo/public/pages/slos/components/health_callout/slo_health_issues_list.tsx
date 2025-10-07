/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchSLOHealthResponse } from '@kbn/slo-schema';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import kbnRison from '@kbn/rison';
import React from 'react';
import { paths } from '../../../../../common/locators/paths';
import { ExternalLinkDisplayText } from '../../../slo_details/components/external_link_display_text';
import { useKibana } from '../../../../hooks/use_kibana';
import { getSLOTransformId, getSLOSummaryTransformId } from '../../../../../common/constants';

interface Props {
  results: FetchSLOHealthResponse;
  linkToTransformPage?: boolean;
  externalLinkTextSize: 's' | 'xs';
}

export function SloHealthIssuesList({ results, linkToTransformPage, externalLinkTextSize }: Props) {
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

  const unhealthyRollupTransforms = results.filter(
    (result) => result.health.rollup === 'unhealthy'
  );
  const unhealthySummaryTransforms = results.filter(
    (result) => result.health.summary === 'unhealthy'
  );
  const missingRollupTransforms = results.filter((result) => result.health.rollup === 'missing');
  const missingSummaryTransforms = results.filter((result) => result.health.summary === 'missing');

  return (
    <ul>
      {unhealthyRollupTransforms.map((result) => (
        <li key={`${result.sloId}-rollup-unhealthy`}>
          <ExternalLinkDisplayText
            textSize={externalLinkTextSize}
            content={`${result.sloName} (unhealthy)`}
            url={
              linkToTransformPage
                ? getUrl(getSLOTransformId(result.sloId, result.sloRevision))
                : paths.sloDetails(result.sloId, '*', undefined, 'overview')
            }
          />
        </li>
      ))}

      {unhealthySummaryTransforms.map((result) => (
        <li key={`${result.sloId}-summary-unhealthy`}>
          <ExternalLinkDisplayText
            textSize={externalLinkTextSize}
            content={`${result.sloName} (unhealthy)`}
            url={
              linkToTransformPage
                ? getUrl(getSLOSummaryTransformId(result.sloId, result.sloRevision))
                : paths.sloDetails(result.sloId, '*', undefined, 'overview')
            }
          />
        </li>
      ))}

      {missingRollupTransforms.map((result) => (
        <li key={`${result.sloId}-rollup-missing`}>
          <ExternalLinkDisplayText
            textSize={externalLinkTextSize}
            content={`${result.sloName} (missing)`}
            url={
              linkToTransformPage
                ? getUrl(getSLOTransformId(result.sloId, result.sloRevision))
                : paths.sloDetails(result.sloId, '*', undefined, 'overview')
            }
          />
        </li>
      ))}

      {missingSummaryTransforms.map((result) => (
        <li key={`${result.sloId}-summary-missing`}>
          <ExternalLinkDisplayText
            textSize={externalLinkTextSize}
            content={`${result.sloName} (missing)`}
            url={
              linkToTransformPage
                ? getUrl(getSLOSummaryTransformId(result.sloId, result.sloRevision))
                : paths.sloDetails(result.sloId, '*', undefined, 'overview')
            }
          />
        </li>
      ))}
    </ul>
  );
}
