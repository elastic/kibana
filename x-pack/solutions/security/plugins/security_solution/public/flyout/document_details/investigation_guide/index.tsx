/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { OpenInvestigatedDocument } from '../shared/components/open_investigated_document';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { useInvestigationGuide } from '../shared/hooks/use_investigation_guide';
import { INVESTIGATION_GUIDE_LOADING_TEST_ID, INVESTIGATION_GUIDE_TEST_ID } from './test_ids';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { InvestigationGuideView } from './components/investigation_guide_view';
import type { DocumentDetailsProps } from '../shared/types';
import { useDocumentDetailsContext } from '../shared/context';

export const InvestigationGuidePanel: FC<Partial<DocumentDetailsProps>> = memo(({ path }) => {
  const { euiTheme } = useEuiTheme();
  const { eventId, scopeId, indexName, dataFormattedForFieldBrowser, isRulePreview } =
    useDocumentDetailsContext();

  const { loading, error, basicAlertData, ruleNote } = useInvestigationGuide({
    dataFormattedForFieldBrowser,
  });

  return (
    <FlyoutBody
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <OpenInvestigatedDocument eventId={eventId} indexName={indexName} scopeId={scopeId} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <div data-test-subj={INVESTIGATION_GUIDE_TEST_ID}>
        {isRulePreview ? (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.investigation.previewMessage"
            defaultMessage="Investigation guide is not available in alert preview."
          />
        ) : loading ? (
          <FlyoutLoading data-test-subj={INVESTIGATION_GUIDE_LOADING_TEST_ID} />
        ) : !error && basicAlertData.ruleId && ruleNote ? (
          <InvestigationGuideView
            basicData={basicAlertData}
            ruleNote={ruleNote}
            showTitle={false}
            showFullView={true}
          />
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.investigation.noDataDescription"
            defaultMessage="There's no investigation guide for this rule. {documentation} to add one."
            values={{
              documentation: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/security/current/rules-ui-management.html#edit-rules-settings"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.left.investigation.noDataLinkText"
                    defaultMessage="Edit the rule's settings"
                  />
                </EuiLink>
              ),
            }}
          />
        )}
      </div>
    </FlyoutBody>
  );
});

InvestigationGuidePanel.displayName = 'InvestigationGuidePanel';
