/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  DEFAULT_TRANSLATION_SEVERITY,
  SPLUNK_ELASTIC_ALERT_SEVERITY_MAP,
} from '../../../../../../common/siem_migrations/constants';
import type { SplunkSeverity } from '../../../../../../common/siem_migrations/types';

export const mapSplunkSeverityToElasticSeverity = (
  splunkSeverity?: keyof SplunkSeverity
): Severity => {
  if (!splunkSeverity) {
    return DEFAULT_TRANSLATION_SEVERITY;
  }

  return SPLUNK_ELASTIC_ALERT_SEVERITY_MAP[splunkSeverity] || DEFAULT_TRANSLATION_SEVERITY;
};
