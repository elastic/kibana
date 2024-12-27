/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HTTP_REDIRECT_WARNING_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.oauthAuthorize.httpRedirectWarningMessage',
  {
    defaultMessage: 'This application is using an insecure redirect URI (http)',
  }
);

export const SCOPES_LEAD_IN_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.oauthAuthorize.scopesLeadInMessage',
  {
    defaultMessage: 'This application will be able to',
  }
);

export const AUTHORIZATION_REQUIRED_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.oauthAuthorize.authorizationTitle',
  {
    defaultMessage: 'Authorization required',
  }
);

export const AUTHORIZE_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.oauthAuthorize.authorizeButtonLabel',
  {
    defaultMessage: 'Authorize',
  }
);

export const DENY_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.oauthAuthorize.denyButtonLabel',
  {
    defaultMessage: 'Deny',
  }
);

export const SEARCH_SCOPE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.oauthAuthorize.searchScopeDescription',
  {
    defaultMessage: 'Search your data',
  }
);

export const WRITE_SCOPE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.oauthAuthorize.writeScopeDescription',
  {
    defaultMessage: 'Modify your data',
  }
);
