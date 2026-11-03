/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ATTACK_DISCOVERY_ADDITIONAL_CONTEXT_MAX_LENGTH } from '@kbn/alertzero-common';

export const ADDITIONAL_CONTEXT_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.additionalContext.label',
  { defaultMessage: 'Additional context' }
);

export const ADDITIONAL_CONTEXT_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.additionalContext.help',
  {
    defaultMessage:
      'Guidance added to the Attack Discovery prompt on every scheduled run, such as environment details or what your analysts care about. Sent to the model as written and not anonymized, so leave out sensitive identifiers. Stored in the workflow and shown in its executions, so anyone who can view them can read it. Up to {max} characters.',
    values: { max: ATTACK_DISCOVERY_ADDITIONAL_CONTEXT_MAX_LENGTH },
  }
);

export const ADDITIONAL_CONTEXT_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.additionalContext.ariaLabel',
  { defaultMessage: 'Additional context for Attack Discovery' }
);

export const ADDITIONAL_CONTEXT_EXPRESSION_ERROR = i18n.translate(
  'xpack.alertzero.watches.settings.additionalContext.expressionError',
  {
    defaultMessage:
      'Additional context cannot be a single template expression such as {example}. Add text before or after it.',
    values: { example: '${{ … }}' },
  }
);
