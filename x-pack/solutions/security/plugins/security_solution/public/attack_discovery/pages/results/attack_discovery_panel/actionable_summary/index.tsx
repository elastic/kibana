/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import {
  type AttackDiscovery,
  replaceAnonymizedValuesWithOriginalValues,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import React, { useMemo } from 'react';

import { SECURITY_FEATURE_ID } from '../../../../../../common';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoveryMarkdownFormatter } from '../../attack_discovery_markdown_formatter';
import { ViewInAiAssistant } from '../view_in_ai_assistant';

interface Props {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
  showAnonymized?: boolean;
}

const ActionableSummaryComponent: React.FC<Props> = ({
  attackDiscovery,
  replacements,
  showAnonymized = false,
}) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  // TODO We shouldn't have to check capabilities here, this should be done at a much higher level.
  //  https://github.com/elastic/kibana/issues/218731
  //  For the AI for SOC we need to hide cell actions and all preview links that could open non-AI4DSOC flyouts
  const disabledActions = useMemo(
    () => showAnonymized || Boolean(capabilities[SECURITY_FEATURE_ID].configurations),
    [capabilities, showAnonymized]
  );

  const entitySummary = useMemo(
    () =>
      showAnonymized
        ? attackDiscovery.entitySummaryMarkdown
        : replaceAnonymizedValuesWithOriginalValues({
            messageContent: attackDiscovery.entitySummaryMarkdown ?? '',
            replacements: { ...replacements },
          }),

    [attackDiscovery.entitySummaryMarkdown, replacements, showAnonymized]
  );

  // title will be used as a fallback if entitySummaryMarkdown is empty
  const title = useMemo(
    () =>
      showAnonymized
        ? attackDiscovery.title
        : replaceAnonymizedValuesWithOriginalValues({
            messageContent: attackDiscovery.title,
            replacements: { ...replacements },
          }),

    [attackDiscovery.title, replacements, showAnonymized]
  );

  const entitySummaryOrTitle =
    entitySummary != null && entitySummary.length > 0 ? entitySummary : title;

  return (
    <EuiPanel color="subdued" data-test-subj="actionableSummary">
      <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem data-test-subj="entitySummaryMarkdown" grow={false}>
          <AttackDiscoveryMarkdownFormatter
            disableActions={disabledActions}
            markdown={entitySummaryOrTitle}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <ViewInAiAssistant
            compact={true}
            attackDiscovery={attackDiscovery}
            replacements={replacements}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ActionableSummaryComponent.displayName = 'ActionableSummary';

export const ActionableSummary = React.memo(ActionableSummaryComponent);
