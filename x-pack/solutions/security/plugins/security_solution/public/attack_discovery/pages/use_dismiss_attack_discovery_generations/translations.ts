/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DISMISS_ATTACK_DISCOVERY_GENERATIONS_SUCCESS = (succeeded = 1) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.usePostAttackDiscoveryGenerationsDismiss.dismissAttackDiscoveryGenerationsSuccess',
    {
      defaultMessage:
        '{succeeded, plural, one {# attack discovery generation} other {# attack discovery generations}} dismissed successfully.',
      values: { succeeded },
    }
  );

export const DISMISS_ATTACK_DISCOVERY_GENERATIONS_FAILURE = (failed = 1) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.usePostAttackDiscoveryGenerationsDismiss.dismissAttackDiscoveryGenerationsFailDescription',
    {
      defaultMessage:
        'Failed to dismiss {failed, plural, one {# attack discovery generation} other {# attack discovery generations}}',
      values: { failed },
    }
  );
