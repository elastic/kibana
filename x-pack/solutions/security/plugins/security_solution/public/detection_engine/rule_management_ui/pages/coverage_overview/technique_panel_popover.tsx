/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiListGroupItemProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  EuiSpacer,
  EuiAccordion,
} from '@elastic/eui';
import { css, cx } from '@emotion/css';
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';
import { CoverageOverviewRuleListHeader } from './shared_components/popover_list_header';
import { CoverageOverviewMitreTechniquePanel } from './technique_panel';
import * as i18n from './translations';
import { RuleLink } from '../../components/rules_table/use_columns';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { getNumOfCoveredSubtechniques } from '../../../rule_management/model/coverage_overview/mitre_subtechnique';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

export interface CoverageOverviewMitreTechniquePanelPopoverProps {
  technique: CoverageOverviewMitreTechnique;
}

const CoverageOverviewMitreTechniquePanelPopoverComponent = ({
  technique,
}: CoverageOverviewMitreTechniquePanelPopoverProps) => {
  const canEditRules = useUserPrivileges().rulesPrivileges.edit;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const isEnableButtonDisabled = useMemo(
    () => !canEditRules || technique.disabledRules.length === 0,
    [canEditRules, technique.disabledRules.length]
  );
  const isInstallButtonDisabled = useMemo(
    () => !canEditRules || technique.availableRules.length === 0,
    [canEditRules, technique.availableRules.length]
  );

  const {
    state: {
      showExpandedCells,
      filter: { activity },
    },
    actions: { enableAllDisabled, installAvailableRules },
  } = useCoverageOverviewDashboardContext();

  const coveredSubtechniques = useMemo(
    () => getNumOfCoveredSubtechniques(technique, activity),
    [activity, technique]
  );

  const handleEnableAllDisabled = useCallback(async () => {
    setIsLoading(true);
    const ruleIds = technique.disabledRules.map((rule) => rule.id);
    await enableAllDisabled(ruleIds);
    setIsLoading(false);
    closePopover();
  }, [closePopover, enableAllDisabled, technique.disabledRules]);

  const handleInstallRules = useCallback(async () => {
    setIsLoading(true);
    const rules = technique.availableRules.map((r) => ({ rule_id: r.id, version: r.version }));
    await installAvailableRules(rules);
    setIsLoading(false);
    closePopover();
  }, [closePopover, installAvailableRules, technique.availableRules]);

  const TechniquePanel = (
    <CoverageOverviewMitreTechniquePanel
      setIsPopoverOpen={setIsPopoverOpen}
      isPopoverOpen={isPopoverOpen}
      technique={technique}
      isExpanded={showExpandedCells}
      coveredSubtechniques={coveredSubtechniques}
    />
  );
  const CoveredSubtechniquesLabel = useMemo(
    () => (
      <EuiText color="success" size="s">
        <h4>
          {i18n.COVERED_MITRE_SUBTECHNIQUES(coveredSubtechniques, technique.subtechniques.length)}
        </h4>
      </EuiText>
    ),
    [coveredSubtechniques, technique.subtechniques.length]
  );

  const enabledRuleListItems: EuiListGroupItemProps[] = useMemo(
    () =>
      technique.enabledRules.map((rule) => ({
        label: <RuleLink name={rule.name} id={rule.id} />,
        color: 'primary',
      })),
    [technique.enabledRules]
  );

  const disabledRuleListItems: EuiListGroupItemProps[] = useMemo(
    () =>
      technique.disabledRules.map((rule) => ({
        label: <RuleLink name={rule.name} id={rule.id} />,
        color: 'primary',
      })),
    [technique.disabledRules]
  );

  const availableRuleListItems: EuiListGroupItemProps[] = useMemo(
    () =>
      technique.availableRules.map((rule) => ({
        label: <RuleLink name={rule.name} id={rule.id} />,
        color: 'primary',
      })),
    [technique.availableRules]
  );

  const EnabledRulesAccordionButton = useMemo(
    () => (
      <CoverageOverviewRuleListHeader
        listTitle={i18n.ENABLED_RULES_LIST_LABEL}
        listLength={technique.enabledRules.length}
      />
    ),
    [technique.enabledRules.length]
  );

  const DisabledRulesAccordionButton = useMemo(
    () => (
      <CoverageOverviewRuleListHeader
        listTitle={i18n.DISABLED_RULES_LIST_LABEL}
        listLength={technique.disabledRules.length}
      />
    ),
    [technique.disabledRules.length]
  );

  const AvailableRulesAccordionButton = useMemo(
    () => (
      <CoverageOverviewRuleListHeader
        listTitle={i18n.AVAILABLE_RULES_LIST_LABEL}
        listLength={technique.availableRules.length}
      />
    ),
    [technique.availableRules.length]
  );

  return (
    <EuiPopover
      button={TechniquePanel}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="rightCenter"
      data-test-subj="coverageOverviewPopover"
      ownFocus={false}
    >
      <EuiPopoverTitle
        className={css`
          min-width: 30em;
        `}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="flexStart" direction="column">
          <EuiFlexItem>
            <EuiButtonEmpty
              flush="left"
              iconType="popout"
              iconSide="right"
              href={technique.reference}
              target="_blank"
            >
              <EuiText>
                <h3>{technique.name}</h3>
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>{CoveredSubtechniquesLabel}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <div className={cx(css({ maxHeight: '40em', padding: '5px 0px' }), 'eui-yScrollWithShadows')}>
        <EuiAccordion
          id="enabledRulesListAccordion"
          initialIsOpen={true}
          buttonContent={EnabledRulesAccordionButton}
        >
          <EuiListGroup
            data-test-subj="coverageOverviewEnabledRulesList"
            flush
            listItems={enabledRuleListItems}
            size="s"
          />
        </EuiAccordion>
        <EuiSpacer size="s" />
        <EuiAccordion id="disabledRulesListAccordion" buttonContent={DisabledRulesAccordionButton}>
          <EuiListGroup
            data-test-subj="coverageOverviewDisabledRulesList"
            flush
            listItems={disabledRuleListItems}
            size="s"
          />
        </EuiAccordion>
        <EuiSpacer size="s" />
        <EuiAccordion
          id="availableRulesListAccordion"
          buttonContent={AvailableRulesAccordionButton}
        >
          <EuiListGroup
            data-test-subj="coverageOverviewAvailableRulesList"
            flush
            listItems={availableRuleListItems}
            size="s"
          />
        </EuiAccordion>
      </div>
      <EuiPopoverFooter>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton
              data-test-subj="enableAllDisabledButton"
              isLoading={isLoading}
              disabled={isEnableButtonDisabled}
              onClick={handleEnableAllDisabled}
              size="s"
              iconType="checkInCircleFilled"
            >
              {i18n.ENABLE_ALL_DISABLED}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              data-test-subj="installAvailableRulesButton"
              isLoading={isLoading}
              disabled={isInstallButtonDisabled}
              onClick={handleInstallRules}
              size="s"
              iconType="plusInCircle"
            >
              {i18n.INSTALL_AVAILABLE_RULES}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

export const CoverageOverviewMitreTechniquePanelPopover = memo(
  CoverageOverviewMitreTechniquePanelPopoverComponent
);
