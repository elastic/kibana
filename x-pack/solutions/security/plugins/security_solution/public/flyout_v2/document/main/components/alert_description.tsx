/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { isNonLocalIndexName } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useAlertingRulesCache } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useKibana } from '../../../../common/lib/kibana';
import { EventKind } from '../constants/event_kinds';
import { isRulePreviewDocument } from '../../../shared/utils/is_rule_preview_document';
import {
  ALERT_DESCRIPTION_DETAILS_TEST_ID,
  ALERT_DESCRIPTION_TITLE_TEST_ID,
  RULE_SUMMARY_BUTTON_TEST_ID,
} from './test_ids';

export interface AlertDescriptionProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * Callback to show the rule summary flyout when the "Show rule summary" button is clicked. If not provided, the button won't be rendered.
   */
  onShowRuleSummary?: () => void;
}

/**
 * Displays the rule description of a signal document.
 */
export const AlertDescription: FC<AlertDescriptionProps> = ({ hit, onShowRuleSummary }) => {
  const canReadRules = useUserPrivileges().rulesPrivileges.rules.read;
  const isRulePreview = useMemo(() => isRulePreviewDocument(hit), [hit]);
  const isRemoteDocument = useMemo(
    () => isNonLocalIndexName(hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? ''),
    [hit]
  );
  const ruleSummaryDisabled = isRulePreview || !canReadRules || isRemoteDocument;
  const isAlert = useMemo(
    () =>
      (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal ||
      (getFieldValue(hit, 'type') as string) === 'alert',
    [hit]
  );

  // v2 episodes carry `rule.id` but not the rule's description, so we resolve it from the rule via
  // the RnA rules-by-ids lookup (same as the flyout title). v1 reads `kibana.alert.rule.description`
  // straight off the document. `ruleIds` is memoized: the hook feeds it into a `useAsync` dep list.
  const { services } = useKibana();
  const isEpisode = useMemo(() => getFieldValue(hit, 'episode.id') != null, [hit]);
  const episodeRuleId = useMemo(() => getFieldValue(hit, 'rule.id') as string | undefined, [hit]);
  const ruleIds = useMemo(
    () => (isEpisode && episodeRuleId ? [episodeRuleId] : []),
    [isEpisode, episodeRuleId]
  );
  const { rulesCache } = useAlertingRulesCache({ ruleIds, services: { http: services.http } });

  const ruleDescription = useMemo(
    () =>
      isEpisode
        ? episodeRuleId
          ? rulesCache[episodeRuleId]?.metadata?.description
          : undefined
        : (getFieldValue(hit, 'kibana.alert.rule.description') as string),
    [isEpisode, episodeRuleId, rulesCache, hit]
  );

  const viewRule = useMemo(
    () => (
      <EuiButtonEmpty
        size="s"
        iconType="maximize"
        onClick={onShowRuleSummary}
        iconSide="right"
        data-test-subj={RULE_SUMMARY_BUTTON_TEST_ID}
        aria-label={i18n.translate(
          'xpack.securitySolution.flyout.document.about.description.ruleSummaryButtonAriaLabel',
          {
            defaultMessage: 'Show rule summary',
          }
        )}
        disabled={ruleSummaryDisabled}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.document.about.description.ruleSummaryButtonLabel"
          defaultMessage="Show rule summary"
        />
      </EuiButtonEmpty>
    ),
    [onShowRuleSummary, ruleSummaryDisabled]
  );

  const alertRuleDescription = useMemo(
    () =>
      ruleDescription?.length > 0 ? (
        ruleDescription
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.document.about.description.noRuleDescription"
          defaultMessage="There's no description for this rule."
        />
      ),
    [ruleDescription]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={ALERT_DESCRIPTION_TITLE_TEST_ID} grow={false}>
        <EuiTitle size="xxs">
          {isAlert ? (
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="none"
              responsive={false}
            >
              <EuiFlexItem>
                <h5>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.document.about.description.ruleTitle"
                    defaultMessage="Rule description"
                  />
                </h5>
              </EuiFlexItem>
              {onShowRuleSummary && <EuiFlexItem grow={false}>{viewRule}</EuiFlexItem>}
            </EuiFlexGroup>
          ) : (
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.flyout.document.about.description.documentTitle"
                defaultMessage="Document description"
              />
            </h5>
          )}
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={ALERT_DESCRIPTION_DETAILS_TEST_ID}>
        <p
          css={css`
            word-break: break-word;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          `}
        >
          {isAlert ? alertRuleDescription : '-'}
        </p>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AlertDescription.displayName = 'AlertDescription';
