/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_UUID, EVENT_KIND, TIMESTAMP } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { HeaderTitle } from './components/header_title';
import { DocumentSeverity } from './components/severity';
import { RiskScore } from './components/risk_score';
import { AlertHeaderBlock } from '../shared/components/alert_header_block';
import {
  ALERT_SUMMARY_PANEL_TEST_ID,
  RISK_SCORE_TITLE_TEST_ID,
} from '../shared/components/test_ids';
import { useKibana } from '../../common/lib/kibana';
import { getRuleDetailsUrl } from '../../common/components/link_to';
import { PreferenceFormattedDate } from '../../common/components/formatted_date';

const blockStyles = {
  minWidth: 280,
};

export interface HeaderProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

/**
 * Document header for the flyout_v2 document flyout.
 * Renders severity, timestamp, title (as a rule-details link for alerts),
 * and alert-only summary blocks (risk score).
 */
export const Header: FC<HeaderProps> = memo(({ hit }) => {
  const { services } = useKibana();

  const timestamp = useMemo(() => getFieldValue(hit, TIMESTAMP) as string, [hit]);
  const ruleId = useMemo(
    () => (getFieldValue(hit, ALERT_RULE_UUID) as string | null) ?? null,
    [hit]
  );
  const isAlert = useMemo(() => (getFieldValue(hit, EVENT_KIND) as string) === 'signal', [hit]);

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
      {isAlert && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            responsive={false}
            wrap
            data-test-subj={ALERT_SUMMARY_PANEL_TEST_ID}
          >
            <EuiFlexItem css={blockStyles}>
              <AlertHeaderBlock
                hasBorder
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.document.header.riskScoreTitle"
                    defaultMessage="Risk score"
                  />
                }
                data-test-subj={RISK_SCORE_TITLE_TEST_ID}
              >
                <RiskScore hit={hit} />
              </AlertHeaderBlock>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
});

Header.displayName = 'Header';
