/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { IBasePath } from '@kbn/core-http-browser';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { useKibana } from '../../../hooks/use_kibana';
import { paths } from '../../../../common/locators/paths';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';

export const useSloFormattedSummary = (slo: SLOWithSummaryResponse) => {
  const {
    http: { basePath },
    uiSettings,
  } = useKibana().services;

  return getSloFormattedSummary(slo, uiSettings, basePath);
};

export const getSloFormattedSummary = (
  slo: SLOWithSummaryResponse,
  uiSettings: IUiSettingsClient,
  basePath: IBasePath
) => {
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const sliValue =
    slo.summary.status === 'NO_DATA'
      ? NOT_AVAILABLE_LABEL
      : numeral(slo.summary.sliValue).format(percentFormat);

  const sloTarget = numeral(slo.objective.target).format(percentFormat);
  const errorBudgetRemaining =
    slo.summary.errorBudget.remaining <= 0
      ? Math.trunc(slo.summary.errorBudget.remaining * 100) / 100
      : slo.summary.errorBudget.remaining;

  const errorBudgetRemainingTitle =
    slo.summary.status === 'NO_DATA'
      ? NOT_AVAILABLE_LABEL
      : numeral(errorBudgetRemaining).format(percentFormat);

  const sloDetailsUrl = basePath.prepend(
    paths.sloDetails(slo.id, slo.instanceId, slo.remote?.remoteName)
  );

  return {
    sloDetailsUrl,
    sliValue,
    sloTarget,
    errorBudgetRemaining: errorBudgetRemainingTitle,
  };
};

export const useSloFormattedSLIValue = (sliValue?: number): string | null => {
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const formattedSLIValue =
    sliValue !== undefined && sliValue !== null ? numeral(sliValue).format(percentFormat) : null;

  return formattedSLIValue;
};
