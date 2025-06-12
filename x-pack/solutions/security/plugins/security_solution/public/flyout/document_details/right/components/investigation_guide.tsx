/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiButton, EuiSkeletonText, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useInvestigationGuide } from '../../shared/hooks/use_investigation_guide';
import { useDocumentDetailsContext } from '../../shared/context';
import { LeftPanelInvestigationTab } from '../../left';
import {
  INVESTIGATION_GUIDE_BUTTON_TEST_ID,
  INVESTIGATION_GUIDE_LOADING_TEST_ID,
  INVESTIGATION_GUIDE_TEST_ID,
} from './test_ids';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';

/**
 * Render either the investigation guide button that opens Investigation section in the left panel,
 * or a no-data message if investigation guide hasn't been set up on the rule
 */
export const InvestigationGuide: React.FC = () => {
  const { dataFormattedForFieldBrowser, isRulePreview } = useDocumentDetailsContext();

  const { loading, error, basicAlertData, ruleNote } = useInvestigationGuide({
    dataFormattedForFieldBrowser,
  });

  const { navigateToLeftPanel: goToInvestigationsTab, isEnabled: isLinkEnabled } =
    useNavigateToLeftPanel({
      tab: LeftPanelInvestigationTab,
    });

  const hasInvestigationGuide = useMemo(
    () => !error && basicAlertData && basicAlertData.ruleId && ruleNote,
    [error, basicAlertData, ruleNote]
  );

  const content = useMemo(() => {
    if (isRulePreview) {
      return (
        <EuiCallOut
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

    if (hasInvestigationGuide && !isLinkEnabled) {
      return (
        <EuiCallOut
          iconType="documentation"
          size="s"
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.investigation.investigationGuide.openFlyoutTitle"
              defaultMessage="Investigation guide available"
            />
          }
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.investigation.investigationGuide.openFlyoutAriaLabel',
            { defaultMessage: 'Investigation guide available' }
          )}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.investigation.investigationGuide.openFlyoutMessage"
            defaultMessage="Open alert details to access investigation guides."
          />
        </EuiCallOut>
      );
    }

    if (hasInvestigationGuide) {
      return (
        <EuiButton
          onClick={goToInvestigationsTab}
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
  }, [isRulePreview, loading, hasInvestigationGuide, isLinkEnabled, goToInvestigationsTab]);

  return <div data-test-subj={INVESTIGATION_GUIDE_TEST_ID}>{content}</div>;
};

InvestigationGuide.displayName = 'InvestigationGuideButton';
