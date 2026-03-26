/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_UUID, TIMESTAMP } from '@kbn/rule-data-utils';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { HeaderTitle } from './components/header_title';
import { DocumentSeverity } from './components/severity';
import { useKibana } from '../../common/lib/kibana';
import { getRuleDetailsUrl } from '../../common/components/link_to';
import { PreferenceFormattedDate } from '../../common/components/formatted_date';

export interface HeaderProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

export const Header: FC<HeaderProps> = memo(({ hit }) => {
  const { services } = useKibana();

  const timestamp = useMemo(() => getFieldValue(hit, TIMESTAMP) as string, [hit]);
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

  return (
    <>
      <DocumentSeverity hit={hit} />
      <EuiSpacer size="m" />
      {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
      <EuiSpacer size="xs" />
      <HeaderTitle hit={hit} titleHref={ruleDetailsHref} />
    </>
  );
});

Header.displayName = 'Header';
