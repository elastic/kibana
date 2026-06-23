/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { GraphNotificationBadge } from '../../graph_notification_badge';
import { getCountryFlag } from '../country_flags/country_codes';
import { displayCount } from './label_node_badges';

export const TEST_SUBJ_METADATA_ROW = 'label-node-metadata-row';
export const TEST_SUBJ_IP_ROW = 'label-node-ip-row';
export const TEST_SUBJ_GEO_ROW = 'label-node-geo-row';
export const TEST_SUBJ_IP_OVERFLOW = 'label-node-ip-overflow';
export const TEST_SUBJ_GEO_OVERFLOW = 'label-node-geo-overflow';

const VISIBLE_FLAGS_LIMIT = 2;

export interface LabelNodeDetailsProps {
  ips?: string[];
  countryCodes?: string[];
}

export const LabelNodeDetails = ({ ips, countryCodes }: LabelNodeDetailsProps) => {
  const { euiTheme } = useEuiTheme();

  const showIp = ips && ips.length > 0;
  const validCountryCodes =
    countryCodes?.filter((code) => getCountryFlag(code) !== null).slice(0, VISIBLE_FLAGS_LIMIT) ??
    [];
  const showGeo = validCountryCodes.length > 0;
  const extraIpCount = ips && ips.length > 1 ? ips.length - 1 : 0;
  const extraGeoCount =
    countryCodes && countryCodes.length > VISIBLE_FLAGS_LIMIT
      ? countryCodes.length - VISIBLE_FLAGS_LIMIT
      : 0;

  if (!showIp && !showGeo) {
    return null;
  }

  const metadataLabelCss = css`
    font-size: 10.5px;
    line-height: 16px;
    font-weight: ${euiTheme.font.weight.semiBold};
    white-space: nowrap;
  `;

  return (
    <div
      data-test-subj={TEST_SUBJ_METADATA_ROW}
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      `}
    >
      {showIp && (
        <div
          data-test-subj={TEST_SUBJ_IP_ROW}
          css={css`
            display: flex;
            align-items: center;
            gap: 4px;
            height: 20px;
          `}
        >
          <EuiText size="xs" css={metadataLabelCss}>
            {i18n.translate('securitySolutionPackages.csp.graph.labelNode.metadata.ipAddress', {
              defaultMessage: 'IP address',
            })}
          </EuiText>
          {extraIpCount > 0 && (
            <GraphNotificationBadge size="m" color="subdued" data-test-subj={TEST_SUBJ_IP_OVERFLOW}>
              {displayCount(extraIpCount)}
            </GraphNotificationBadge>
          )}
        </div>
      )}

      {showGeo && (
        <div
          data-test-subj={TEST_SUBJ_GEO_ROW}
          css={css`
            display: flex;
            align-items: center;
            gap: 4px;
            height: 20px;
          `}
        >
          {validCountryCodes.map((code) => (
            <span
              key={code}
              css={css`
                font-size: 14px;
                line-height: 20px;
              `}
            >
              {getCountryFlag(code)}
            </span>
          ))}
          {extraGeoCount > 0 && (
            <GraphNotificationBadge size="m" color="subdued" data-test-subj={TEST_SUBJ_GEO_OVERFLOW}>
              {displayCount(extraGeoCount)}
            </GraphNotificationBadge>
          )}
        </div>
      )}
    </div>
  );
};
