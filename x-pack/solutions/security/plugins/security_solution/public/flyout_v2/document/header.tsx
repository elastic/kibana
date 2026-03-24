/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { HeaderTitle } from './components/header_title';
import { useKibana } from '../../common/lib/kibana';
import { getRuleDetailsUrl } from '../../common/components/link_to';

export interface HeaderProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

/**
 * Document header container for the flyout.
 * Currently renders only the title; future PRs will add severity, timestamp, and metadata blocks.
 */
export const Header: FC<HeaderProps> = memo(({ hit }) => {
  const { services } = useKibana();

  const ruleId = useMemo(
    () => (getFieldValue(hit, ALERT_RULE_UUID) as string | null) ?? null,
    [hit]
  );

  const ruleDetailsHref = useMemo(() => {
    if (!ruleId) return undefined;
    const path = getRuleDetailsUrl(ruleId);
    return services.application.getUrlForApp('securitySolutionUI', {
      deepLinkId: SecurityPageName.rules,
      path,
    });
  }, [ruleId, services.application]);

  return <HeaderTitle hit={hit} titleHref={ruleDetailsHref} />;
});

Header.displayName = 'Header';
