/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiLoadingSpinner,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { GetRuleLibraryRuleResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { RuleDetailsFlyoutContent } from '../../../../rule_management/components/rule_details/rule_details_flyout';
import { useFetchRuleLibraryRuleQuery } from '../../../../rule_management/api/hooks/prebuilt_rules/use_fetch_rule_library_rule_query';
import type { LibraryRuleReference } from '../use_install_library_rules';
import * as i18n from '../translations';

const FLYOUT_ID = 'ruleLibraryRulePreview';

interface RuleActionsProps {
  rule: GetRuleLibraryRuleResponseBody;
  libraryId: string;
  canInstall: boolean;
  isInstalling: boolean;
  onInstall: (rules: LibraryRuleReference[], enable: boolean) => void;
}

const RuleActions = ({
  rule,
  libraryId,
  canInstall,
  isInstalling,
  onInstall,
}: RuleActionsProps) => {
  if (rule.install_state === 'installed') {
    return (
      <EuiButton isDisabled data-test-subj="ruleLibraryFlyoutInstalledButton">
        {i18n.INSTALLED}
      </EuiButton>
    );
  }

  if (rule.install_state === 'installed_from_other_library') {
    return (
      <EuiToolTip
        content={i18n.ALREADY_INSTALLED_TOOLTIP(rule.installed_from_library?.title ?? '')}
      >
        <EuiButton isDisabled data-test-subj="ruleLibraryFlyoutInstalledButton">
          {i18n.ALREADY_INSTALLED}
        </EuiButton>
      </EuiToolTip>
    );
  }

  const reference = [{ ruleId: rule.rule.rule_id, version: rule.rule.version, libraryId }];

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiButton
          isDisabled={!canInstall || isInstalling}
          onClick={() => onInstall(reference, false)}
          data-test-subj="installRuleLibraryRuleFromFlyoutButton"
        >
          {i18n.INSTALL_WITHOUT_ENABLING}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          fill
          isDisabled={!canInstall || isInstalling}
          onClick={() => onInstall(reference, true)}
          data-test-subj="installAndEnableRuleLibraryRuleFromFlyoutButton"
        >
          {i18n.INSTALL_AND_ENABLE}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface LibraryRuleFlyoutProps {
  libraryId: string;
  ruleId: string;
  canInstall: boolean;
  isInstalling: boolean;
  onInstall: (rules: LibraryRuleReference[], enable: boolean) => void;
  onClose: () => void;
}

export const LibraryRuleFlyout = ({
  libraryId,
  ruleId,
  canInstall,
  isInstalling,
  onInstall,
  onClose,
}: LibraryRuleFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'ruleLibraryRuleFlyoutTitle' });
  const { data, isLoading, isError, error } = useFetchRuleLibraryRuleQuery({
    library_id: libraryId,
    rule_id: ruleId,
  });

  // One flyout for every state, so it slides in once and stays while the rule loads.
  return (
    <EuiFlyout
      id={FLYOUT_ID}
      size="l"
      paddingSize="l"
      onClose={onClose}
      aria-labelledby={data ? titleId : undefined}
      aria-label={data ? undefined : i18n.LOADING_RULE}
      data-test-subj={FLYOUT_ID}
      ownFocus
    >
      {data ? (
        <RuleDetailsFlyoutContent
          rule={data.rule}
          size="l"
          titleId={titleId}
          closeFlyout={onClose}
          ruleActions={
            <RuleActions
              rule={data}
              libraryId={libraryId}
              canInstall={canInstall}
              isInstalling={isInstalling}
              onInstall={onInstall}
            />
          }
        />
      ) : (
        <EuiFlyoutBody>
          {isLoading ? <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING_RULE} /> : null}
          {isError ? (
            <KbnDangerCallout
              announceOnMount
              title={i18n.LOAD_RULE_ERROR_TITLE}
              text={error instanceof Error ? <p>{error.message}</p> : undefined}
              data-test-subj="ruleLibraryFlyoutLoadError"
            />
          ) : null}
        </EuiFlyoutBody>
      )}
    </EuiFlyout>
  );
};
