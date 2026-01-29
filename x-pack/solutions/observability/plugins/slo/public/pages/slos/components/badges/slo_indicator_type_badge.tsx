/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import {
  ALL_VALUE,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
} from '@kbn/slo-schema';
import { SLOS_PATH } from '@kbn/slo-shared-plugin/common/locators/paths';
import type { MouseEvent } from 'react';
import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useKibana } from '../../../../hooks/use_kibana';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { toIndicatorTypeLabel } from '../../../../utils/slo/labels';
import { useUrlSearchState } from '../../hooks/use_url_search_state';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloIndicatorTypeBadge({ slo }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const isSloPage = useRouteMatch(SLOS_PATH)?.isExact ?? false;

  const { onStateChange } = useUrlSearchState();

  const handleNavigateToApm = () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(slo);
    if (url) {
      navigateToUrl(basePath.prepend(url));
    }
  };

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiBadge
          onClick={(_) => {
            if (isSloPage) {
              onStateChange({
                kqlQuery: `slo.indicator.type: ${slo.indicator.type}`,
              });
            }
          }}
          onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
            if (isSloPage) e.stopPropagation(); // stops propagation of metric onElementClick
          }}
          onClickAriaLabel={i18n.translate('xpack.slo.sloIndicatorTypeBadge.clickToFilter', {
            defaultMessage: 'Click to filter by {indicatorType} SLOs',
            values: { indicatorType: toIndicatorTypeLabel(slo.indicator.type) },
          })}
        >
          {toIndicatorTypeLabel(slo.indicator.type)}
        </EuiBadge>
      </EuiFlexItem>
      {(apmTransactionDurationIndicatorSchema.is(slo.indicator) ||
        apmTransactionErrorRateIndicatorSchema.is(slo.indicator)) &&
        slo.indicator.params.service !== '' &&
        slo.indicator.params.service !== ALL_VALUE && (
          <EuiFlexItem grow={false} css={{ maxWidth: 100 }}>
            <EuiToolTip
              position="top"
              content={i18n.translate('xpack.slo.sloIndicatorTypeBadge.exploreInApm', {
                defaultMessage: 'View {service} details',
                values: { service: slo.indicator.params.service },
              })}
            >
              <EuiBadge
                onClick={handleNavigateToApm}
                onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation(); // stops propagation of metric onElementClick
                }}
                onClickAriaLabel={i18n.translate('xpack.slo.indicatorTypeBadge.exploreInApm', {
                  defaultMessage: 'View {service} details',
                  values: { service: slo.indicator.params.service },
                })}
              >
                {slo.indicator.params.service}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        )}
    </>
  );
}
