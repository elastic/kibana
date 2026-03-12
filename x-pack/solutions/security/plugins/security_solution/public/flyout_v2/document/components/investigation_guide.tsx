/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiCallOut, EuiSkeletonText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import {
  INVESTIGATION_GUIDE_BUTTON_TEST_ID,
  INVESTIGATION_GUIDE_LOADING_TEST_ID,
  INVESTIGATION_GUIDE_TEST_ID,
} from './test_ids';

export interface InvestigationGuideProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * If false we show a message that investigation guide is not available.
   */
  isAvailable: boolean;
  /**
   * Callback invoked when the user clicks "Show investigation guide".
   */
  onShowInvestigationGuide: () => void;
}

/**
 * Render either the investigation guide button that opens Investigation section in the left panel,
 * or a no-data message if investigation guide hasn't been set up on the rule
 */
export const InvestigationGuide: React.FC<InvestigationGuideProps> = ({
  hit,
  isAvailable,
  onShowInvestigationGuide,
}) => {
  const isAlert = useMemo(
    () => Boolean(getFieldValue(hit, 'kibana.alert.rule.uuid') as string),
    [hit]
  );
  const ruleId = useMemo(
    () =>
      (isAlert
        ? (getFieldValue(hit, 'kibana.alert.rule.uuid') as string)
        : (getFieldValue(hit, 'signal.rule.id') as string)) ?? '',
    [hit, isAlert]
  );

  const { loading, error, rule } = useRuleWithFallback(ruleId);
  const ruleNote = rule?.note;

  const hasInvestigationGuide = useMemo(
    () => !error && ruleId && ruleNote,
    [error, ruleId, ruleNote]
  );

  const content = useMemo(() => {
    if (!isAvailable) {
      return (
        <EuiCallOut
          announceOnMount
          iconType="documentation"
          size="s"
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.investigation.investigationGuide.previewTitle"
              defaultMessage="Investigation guide"
            />
          }
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.investigation.investigationGuide.previewAriaLabel',
            { defaultMessage: 'Investigation guide' }
          )}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.investigation.investigationGuide.previewMessage"
            defaultMessage="Investigation guide is not available in alert preview."
          />
        </EuiCallOut>
      );
    }

    if (loading) {
      return (
        <EuiSkeletonText
          data-test-subj={INVESTIGATION_GUIDE_LOADING_TEST_ID}
          contentAriaLabel={i18n.translate(
            'xpack.securitySolution.flyout.right.investigation.investigationGuide.investigationGuideLoadingAriaLabel',
            { defaultMessage: 'investigation guide' }
          )}
        />
      );
    }

    if (hasInvestigationGuide) {
      return (
        <EuiButton
          onClick={onShowInvestigationGuide}
          iconType="documentation"
          size="s"
          fullWidth
          data-test-subj={INVESTIGATION_GUIDE_BUTTON_TEST_ID}
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.investigation.investigationGuide.investigationGuideButtonAriaLabel',
            { defaultMessage: 'Show investigation guide' }
          )}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.investigation.investigationGuide.investigationGuideButtonLabel"
            defaultMessage="Show investigation guide"
          />
        </EuiButton>
      );
    }

    return (
      <EuiCallOut
        iconType="documentation"
        size="s"
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.investigation.investigationGuide.noDataTitle"
            defaultMessage="Investigation guide"
          />
        }
        aria-label={i18n.translate(
          'xpack.securitySolution.flyout.right.investigation.investigationGuide.noDataAriaLabel',
          { defaultMessage: 'Investigation guide' }
        )}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.investigation.investigationGuide.noDataDescription"
          defaultMessage="There's no investigation guide for this rule."
        />
      </EuiCallOut>
    );
  }, [hasInvestigationGuide, isAvailable, loading, onShowInvestigationGuide]);

  return <div data-test-subj={INVESTIGATION_GUIDE_TEST_ID}>{content}</div>;
};

InvestigationGuide.displayName = 'InvestigationGuide';
