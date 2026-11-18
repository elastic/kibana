/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SseBasis } from './classify_basis';

/** What each graded basis is called, on the Kibana card and on other surfaces. */
export const SSE_BASIS_LABELS: Record<SseBasis, string> = {
  ioc_strong: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.basisIocStrong', {
    defaultMessage: 'Strong IOC',
  }),
  ioc_weak: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.basisIocWeak', {
    defaultMessage: 'Weak IOC',
  }),
  behavior_only: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.basisBehaviorOnly', {
    defaultMessage: 'Behavior only',
  }),
  ioc_and_behavior: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.basisIocAndBehavior',
    { defaultMessage: 'IOC and behavior' }
  ),
};
