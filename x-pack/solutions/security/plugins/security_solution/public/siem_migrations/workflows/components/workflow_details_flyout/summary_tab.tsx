/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCode,
} from '@elastic/eui';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import * as i18n from './translations';

export const SummaryTab: React.FC = React.memo(() => (
  <>
    <EuiSpacer size="l" />
    <EuiPanel color="subdued" paddingSize="m" hasShadow={false} hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <AssistantIcon />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.SUMMARY_ASSISTANT_CREATED}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
    <EuiSpacer size="l" />
    <EuiTitle size="xs">
      <h3>{i18n.SUMMARY_MATCHING_TITLE}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <p>{i18n.SUMMARY_MATCHING_INTRO}</p>
      <ol>
        <li>
          <strong>{i18n.SUMMARY_ITEM_1_TITLE}</strong>
          {': '}
          {i18n.SUMMARY_ITEM_1_DESCRIPTION}
        </li>
        <li>
          <strong>{i18n.SUMMARY_ITEM_2_TITLE}</strong>
          {': '}
          {i18n.SUMMARY_ITEM_2_DESCRIPTION_PREFIX} <EuiCode>{'mitre_tactic_id_count >= 3'}</EuiCode>{' '}
          {i18n.SUMMARY_ITEM_2_DESCRIPTION_MIDDLE} <EuiCode>{'source_count >= 4'}</EuiCode>
          {i18n.SUMMARY_ITEM_2_DESCRIPTION_SUFFIX}{' '}
          <EuiCode>{'kibana_alert_rule_name_distinct_count >= 3'}</EuiCode>
          {i18n.SUMMARY_ITEM_2_DESCRIPTION_END}
        </li>
        <li>
          <strong>{i18n.SUMMARY_ITEM_3_TITLE}</strong>
          {': '}
          {i18n.SUMMARY_ITEM_3_DESCRIPTION}
        </li>
        <li>
          <strong>{i18n.SUMMARY_ITEM_4_TITLE}</strong>
          {': '}
          {i18n.SUMMARY_ITEM_4_DESCRIPTION_PREFIX} <EuiCode>{'normalized_risk_object'}</EuiCode>{' '}
          {i18n.SUMMARY_ITEM_4_DESCRIPTION_MIDDLE} <EuiCode>{'risk_object_type'}</EuiCode>
          {i18n.SUMMARY_ITEM_4_DESCRIPTION_SUFFIX} <EuiCode>{'host.id'}</EuiCode>{' '}
          {i18n.SUMMARY_ITEM_4_DESCRIPTION_END}
        </li>
        <li>
          <strong>{i18n.SUMMARY_ITEM_5_TITLE}</strong>
          {': '}
          {i18n.SUMMARY_ITEM_5_DESCRIPTION}
        </li>
      </ol>
      <p>{i18n.SUMMARY_CONCLUSION}</p>
    </EuiText>
  </>
));
SummaryTab.displayName = 'SummaryTab';
