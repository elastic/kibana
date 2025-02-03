/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type {
  ReportTranslatedRuleBulkInstallActionParams,
  ReportTranslatedRuleInstallActionParams,
  ReportTranslatedRuleUpdateActionParams,
} from '../../../common/lib/telemetry/events/siem_migrations/types';
import { SiemMigrationsEventTypes } from '../../../common/lib/telemetry/events/siem_migrations/types';
import { useKibana } from '../../../common/lib/kibana';

export interface TranslatedRuleTelemetry {
  reportTranslatedRuleUpdate: (params: ReportTranslatedRuleUpdateActionParams) => void;
  reportTranslatedRuleInstall: (params: ReportTranslatedRuleInstallActionParams) => void;
  reportTranslatedRuleBulkInstall: (params: ReportTranslatedRuleBulkInstallActionParams) => void;
}

export const useTranslatedRuleTelemetry = (): TranslatedRuleTelemetry => {
  const {
    services: { telemetry },
  } = useKibana();

  const reportTelemetry = useCallback(
    async ({
      eventType,
      params,
    }: {
      eventType: SiemMigrationsEventTypes;
      params:
        | ReportTranslatedRuleUpdateActionParams
        | ReportTranslatedRuleInstallActionParams
        | ReportTranslatedRuleBulkInstallActionParams;
    }) => telemetry.reportEvent(eventType, params),
    [telemetry]
  );

  return {
    reportTranslatedRuleUpdate: (params: ReportTranslatedRuleUpdateActionParams) =>
      reportTelemetry({ eventType: SiemMigrationsEventTypes.TranslatedRuleUpdate, params }),
    reportTranslatedRuleInstall: (params: ReportTranslatedRuleInstallActionParams) =>
      reportTelemetry({ eventType: SiemMigrationsEventTypes.TranslatedRuleInstall, params }),
    reportTranslatedRuleBulkInstall: (params: ReportTranslatedRuleBulkInstallActionParams) =>
      reportTelemetry({ eventType: SiemMigrationsEventTypes.TranslatedRuleBulkInstall, params }),
  };
};
