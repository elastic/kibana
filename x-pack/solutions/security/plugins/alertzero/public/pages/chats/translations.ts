/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.alertzero.chats.pageTitle', {
  defaultMessage: 'Chats',
});

export const GREETING = i18n.translate('xpack.alertzero.chats.greeting', {
  defaultMessage: 'Ask AlertZero anything — investigations, watches, or next steps.',
});

export const AGENT_BUILDER_UNAVAILABLE = i18n.translate(
  'xpack.alertzero.chats.agentBuilderUnavailable',
  {
    defaultMessage:
      'Agent Builder is not available in this deployment. Enable the agentBuilder plugin to use Chats.',
  }
);

export const LOADING = i18n.translate('xpack.alertzero.chats.loading', {
  defaultMessage: 'Loading chats…',
});
