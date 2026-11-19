/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import type { CoreStart } from '@kbn/core/public';
import { MixedCreateChooserBody } from './mixed_create_rule_flyout';
import { useMixedCreatePrototypeSettings } from './mixed_create_prototype_settings';
import { getMixedCreateSessionApi } from './mixed_create_session_api';

export type MixedCreateRulesEmptyStateProps = {
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
  registeredRuleTypes: Array<{ id: string; description: string }>;
  showClassic?: boolean;
};

const MixedCreateRulesEmptyStateInner = ({
  http,
  toasts,
  registeredRuleTypes,
  showClassic = true,
}: MixedCreateRulesEmptyStateProps) => {
  const { euiTheme } = useEuiTheme();
  const { settings } = useMixedCreatePrototypeSettings();
  const {
    ruleTypesState: { data: ruleTypeIndex },
  } = useGetRuleTypesPermissions({
    http,
    toasts,
    registeredRuleTypes,
    enabled: showClassic,
  });

  const classicRuleTypes = useMemo(
    () =>
      [...ruleTypeIndex.values()].map((ruleType) => ({
        id: ruleType.id,
        name: ruleType.name,
        description: ruleType.description,
      })),
    [ruleTypeIndex]
  );

  const api = getMixedCreateSessionApi();

  return (
    <EuiFlexGroup justifyContent="center" data-test-subj="mixedRulesListEmptyState">
      <EuiFlexItem
        grow={false}
        css={css`
          width: 100%;
          max-width: 720px;
          padding: ${euiTheme.size.l} ${euiTheme.size.m};
        `}
      >
        <MixedCreateChooserBody
          onChooseThreshold={() => api?.openThreshold()}
          onChooseEsql={() => api?.openEsql()}
          onChooseAgent={(userInput, esqlQuery) => api?.openAgent(userInput, esqlQuery)}
          onChooseSequence={() => api?.openSequence()}
          onBrowseClassic={(search) => api?.browseClassic(search)}
          onExploreLibrary={() => api?.exploreLibrary()}
          onSelectClassicRuleType={(ruleTypeId) => api?.selectClassicRuleType(ruleTypeId)}
          classicRuleTypes={classicRuleTypes}
          showClassic={showClassic}
          isMaximized={false}
          compactAskAnything={settings.compactAskAnything}
          idleBuilderPresentation={settings.idleBuilderPresentation}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/** MixedCreate chooser as the Rules list empty state (Universal + Classic). */
export const MixedCreateRulesEmptyState = (props: MixedCreateRulesEmptyStateProps) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MixedCreateRulesEmptyStateInner {...props} />
    </QueryClientProvider>
  );
};
