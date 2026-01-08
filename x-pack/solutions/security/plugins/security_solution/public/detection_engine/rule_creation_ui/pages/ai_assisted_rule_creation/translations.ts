/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_ASSISTED_RULE_CREATION_INFO_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.infoTitle',
  {
    defaultMessage: 'Note on AI assisted rule creation',
  }
);

export const AI_ASSISTED_RULE_CREATION_INFO_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.infoMessage',
  {
    defaultMessage:
      'AI assisted rule creation generates a detection rule with name, description, data source, query, tags, severity, risk score, schedule and MITRE ATT&CK mapping fields. Always review the rule before creating and enabling it.',
  }
);

export const AI_ASSISTED_RULE_CREATION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.errorTitle',
  {
    defaultMessage: 'AI assisted rule creation error',
  }
);

export const AI_ASSISTED_RULE_CREATION_ERROR_DURING_STREAM = (errorMessage: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.errorDuringStream', {
    defaultMessage: 'Error during AI assisted rule creation: {errorMessage}',
    values: { errorMessage },
  });

export const AI_ASSISTED_RULE_CREATION_ERROR_STARTING = (errorMessage: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.errorStarting', {
    defaultMessage: 'Error starting AI assisted rule creation: {errorMessage}',
    values: { errorMessage },
  });

export const AI_ASSISTED_RULE_CREATION_ERROR_ABORTING = (errorMessage: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.errorAborting', {
    defaultMessage: 'Error aborting AI assisted rule creation: {errorMessage}',
    values: { errorMessage },
  });

export const AI_ASSISTED_RULE_CREATION_ERROR_UNSUBSCRIBING = (errorMessage: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.errorUnsubscribing',
    {
      defaultMessage: 'Error unsubscribing AI assisted rule creation updates: {errorMessage}',
      values: { errorMessage },
    }
  );
