/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseLinkPropsOptions } from '@kbn/observability-shared-plugin/public';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';

export const createUseRulesLink =
  (unifiedRulesPage: boolean) =>
  (options: UseLinkPropsOptions = {}) => {
    const linkProps = unifiedRulesPage
      ? {
          app: 'rules',
          pathname: '/',
        }
      : {
          app: 'observability',
          pathname: '/alerts/rules',
        };

    return useLinkProps(linkProps, options);
  };
