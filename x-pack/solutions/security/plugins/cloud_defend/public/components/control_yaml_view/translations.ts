/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const errorAlertActionRequired = i18n.translate('xpack.cloudDefend.alertActionRequired', {
  defaultMessage: 'The alert action is required when "block" action used.',
});

export const controlYamlHelp = i18n.translate('xpack.cloudDefend.controlYamlHelp', {
  defaultMessage:
    'Configure your policy by creating "file" or "process" selectors and responses below.',
});

export const controlYamlLoading = i18n.translate('xpack.cloudDefend.controlYamlLoading', {
  defaultMessage: 'Loading editor....',
});
