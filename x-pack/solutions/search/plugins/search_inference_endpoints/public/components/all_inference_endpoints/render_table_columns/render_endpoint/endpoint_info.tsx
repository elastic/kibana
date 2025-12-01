/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { EisPromotionalTour } from '@kbn/search-api-panels';
import { isEndpointPreconfigured } from '../../../../utils/preconfigured_endpoint_helper';
import * as i18n from './translations';
import { isProviderTechPreview } from '../../../../utils/reranker_helper';
import { docLinks } from '../../../../../common/doc_links';

export interface EndpointInfoProps {
  inferenceId: string;
  endpointInfo: InferenceInferenceEndpointInfo;
  isCloudEnabled?: boolean;
}

const EIS_TOUR_ENDPOINT = '.elser-2-elastic';

export const EndpointInfo: React.FC<EndpointInfoProps> = ({
  inferenceId,
  endpointInfo,
  isCloudEnabled,
}) => (
  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={false}>
          {inferenceId === EIS_TOUR_ENDPOINT ? (
            <EisPromotionalTour
              promoId="eisInferenceEndpoint"
              ctaLink={docLinks.elasticInferenceService}
              isCloudEnabled={isCloudEnabled ?? false}
              anchorPosition="rightCenter"
            >
              <span>
                <strong>{inferenceId}</strong>
              </span>
            </EisPromotionalTour>
          ) : (
            <span>
              <strong>{inferenceId}</strong>
            </span>
          )}
        </EuiFlexItem>
        {isProviderTechPreview(endpointInfo) ? (
          <EuiFlexItem grow={false}>
            <span>
              <EuiBetaBadge
                label={i18n.TECH_PREVIEW_LABEL}
                size="s"
                color="subdued"
                alignment="middle"
              />
            </span>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFlexItem>
    {isEndpointPreconfigured(inferenceId) ? (
      <EuiFlexItem grow={false}>
        <span>
          <EuiBetaBadge
            label={i18n.PRECONFIGURED_LABEL}
            size="s"
            color="hollow"
            alignment="middle"
          />
        </span>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);
