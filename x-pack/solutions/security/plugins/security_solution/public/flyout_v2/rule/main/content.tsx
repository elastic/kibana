/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { RuleAboutSection } from '../../../detection_engine/rule_management/components/rule_details/rule_about_section';
import { RuleScheduleSection } from '../../../detection_engine/rule_management/components/rule_details/rule_schedule_section';
import { RuleDefinitionSection } from '../../../detection_engine/rule_management/components/rule_details/rule_definition_section';
import { StepRuleActionsReadOnly } from '../../../detection_engine/rule_creation/components/step_rule_actions';
import { getStepsData } from '../../../detection_engine/common/helpers';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import {
  RULE_DETAILS_ABOUT_TEST_ID,
  RULE_DETAILS_DEFINITION_TEST_ID,
  RULE_DETAILS_SCHEDULE_TEST_ID,
  RULE_DETAILS_ACTIONS_TEST_ID,
} from './test_ids';

const panelViewStyle = css`
  dt {
    font-size: 90% !important;
  }

  text-overflow: ellipsis;

  .euiFlexItem {
    inline-size: inherit;
    flex-basis: inherit;
  }
`;

export interface ContentProps {
  /**
   * Rule object that represents relevant information about a rule
   */
  rule: RuleResponse;
}

export const Content = memo(({ rule }: ContentProps) => {
  const { ruleActionsData } = useMemo(
    () => (rule != null ? getStepsData({ rule, detailsView: true }) : { ruleActionsData: null }),
    [rule]
  );

  const hasNotificationActions = useMemo(
    () => Boolean(ruleActionsData?.actions?.length),
    [ruleActionsData]
  );
  const hasResponseActions = useMemo(
    () => Boolean(ruleActionsData?.responseActions?.length),
    [ruleActionsData]
  );
  const hasActions = useMemo(
    () => ruleActionsData != null && (hasNotificationActions || hasResponseActions),
    [ruleActionsData, hasNotificationActions, hasResponseActions]
  );

  return (
    <>
      <ExpandableSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.ruleDetails.aboutLabel"
            defaultMessage="About"
          />
        }
        expanded
        data-test-subj={RULE_DETAILS_ABOUT_TEST_ID}
      >
        <EuiText size="s">{rule.description}</EuiText>
        <EuiSpacer size="s" />
        <RuleAboutSection
          rule={rule}
          hideName
          hideDescription
          type="row"
          rowGutterSize="s"
          className={panelViewStyle}
        />
      </ExpandableSection>
      <EuiHorizontalRule margin="m" />
      <ExpandableSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.ruleDetails.definitionLabel"
            defaultMessage="Definition"
          />
        }
        expanded={false}
        data-test-subj={RULE_DETAILS_DEFINITION_TEST_ID}
      >
        <RuleDefinitionSection
          rule={rule}
          type="row"
          rowGutterSize="s"
          className={panelViewStyle}
        />
      </ExpandableSection>
      <EuiHorizontalRule margin="m" />
      <ExpandableSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.ruleDetails.scheduleLabel"
            defaultMessage="Schedule"
          />
        }
        expanded={false}
        data-test-subj={RULE_DETAILS_SCHEDULE_TEST_ID}
      >
        <RuleScheduleSection rule={rule} type="row" rowGutterSize="s" className={panelViewStyle} />
      </ExpandableSection>
      <EuiHorizontalRule margin="m" />
      {hasActions && ruleActionsData != null && (
        <ExpandableSection
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.ruleDetails.actionsLabel"
              defaultMessage="Actions"
            />
          }
          expanded={false}
          data-test-subj={RULE_DETAILS_ACTIONS_TEST_ID}
        >
          <StepRuleActionsReadOnly addPadding={false} defaultValues={ruleActionsData} />
        </ExpandableSection>
      )}
    </>
  );
});

Content.displayName = 'Content';
