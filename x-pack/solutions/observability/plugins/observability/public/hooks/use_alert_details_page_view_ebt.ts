/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Telemetry hook for alert details page view in Observability.
 */

import { useEffect } from 'react';
import { useKibana } from '../utils/kibana_react';

export const useAlertDetailsPageViewEbt = ({ ruleType }: { ruleType?: string }) => {
  const { telemetryClient } = useKibana().services;

  useEffect(() => {
    if (ruleType) {
      telemetryClient.reportAlertDetailsPageView(ruleType);
    }
  }, [ruleType, telemetryClient]);
};
