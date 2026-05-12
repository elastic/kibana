/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { Header } from '../../../flyout_v2/rule/header';
import { Content } from '../../../flyout_v2/rule/content';
import { PreviewFooter } from '../preview/footer';
import { useRuleDetails } from '../../../flyout_v2/rule/hooks/use_rule_details';
import { LOADING_TEST_ID } from './test_ids';
import { FlyoutLoading } from '../../../flyout_v2/shared/components/flyout_loading';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { FlyoutError } from '../../../flyout_v2/shared/components/flyout_error';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutBody } from '../../shared/components/flyout_body';

export interface RulePanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'rule-panel' | 'rule-preview-panel';
  params: {
    ruleId: string;
    isPreviewMode?: boolean;
  };
}

export const RulePanelKey: RulePanelExpandableFlyoutProps['key'] = 'rule-panel';
export const RulePreviewPanelKey: RulePanelExpandableFlyoutProps['key'] = 'rule-preview-panel';

export const RULE_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.right.rule.rulePreviewTitle', {
    defaultMessage: 'Preview rule details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export interface RulePanelProps extends Record<string, unknown> {
  /**
   * Rule ID
   */
  ruleId: string;
  /**
   * If in preview mode, show preview banner and footer
   */
  isPreviewMode?: boolean;
}

/**
 * Displays a rule overview panel
 */
export const RulePanel: FC<RulePanelProps> = memo(({ ruleId, isPreviewMode }) => {
  const { rule, loading, isExistingRule } = useRuleDetails({ ruleId });

  return loading ? (
    <FlyoutLoading data-test-subj={LOADING_TEST_ID} />
  ) : rule ? (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} isPreviewMode={isPreviewMode} />
      <FlyoutHeader>
        <Header rule={rule} isSuppressed={!isExistingRule} />
      </FlyoutHeader>
      <FlyoutBody>
        <Content rule={rule} />
      </FlyoutBody>
      <PreviewFooter rule={rule} isPreviewMode={isPreviewMode} />
    </>
  ) : (
    <FlyoutError />
  );
});

RulePanel.displayName = 'RulePanel';
