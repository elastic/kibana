/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { ScopeAccess, WatchScope, WatchScopeRoutingSettings } from '@kbn/pnd-common';
import { SettingsSection } from './settings_section';
import * as i18n from '../settings_translations';

/** Access level drives the chip's dot: full reads as fine, masked as caution, denied as blocked. */
const ACCESS_ICON_COLOR: Record<ScopeAccess, 'success' | 'warning' | 'danger'> = {
  full: 'success',
  masked: 'warning',
  denied: 'danger',
};

interface WatchScopeRoutingSectionProps {
  scopeRouting: WatchScopeRoutingSettings;
  /** Data boundaries come from the watch's own scopes, which carry an access level. */
  scopes: WatchScope[];
  onSelectChange: (
    key: 'dataSources' | 'assigneeQueue' | 'escalationContact',
    selectedId: string
  ) => void;
}

export const WatchScopeRoutingSection: React.FC<WatchScopeRoutingSectionProps> = ({
  scopeRouting,
  scopes,
  onSelectChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const { dataSources, assigneeQueue, escalationContact } = scopeRouting;

  const selects = [
    {
      key: 'dataSources' as const,
      label: i18n.DATA_SOURCES_LABEL,
      helpText: i18n.DATA_SOURCES_HELP,
      setting: dataSources,
      labels: i18n.DATA_SOURCE_OPTION_LABELS,
      testSubj: 'pndWatchDataSourcesSelect',
    },
    {
      key: 'assigneeQueue' as const,
      label: i18n.ASSIGNEE_QUEUE_LABEL,
      helpText: i18n.ASSIGNEE_QUEUE_HELP,
      setting: assigneeQueue,
      labels: i18n.ASSIGNEE_QUEUE_OPTION_LABELS,
      testSubj: 'pndWatchAssigneeQueueSelect',
    },
    {
      key: 'escalationContact' as const,
      label: i18n.ESCALATION_CONTACT_LABEL,
      helpText: i18n.ESCALATION_CONTACT_HELP,
      setting: escalationContact,
      labels: i18n.ESCALATION_CONTACT_OPTION_LABELS,
      testSubj: 'pndWatchEscalationContactSelect',
    },
  ];

  return (
    <SettingsSection
      title={i18n.SCOPE_SECTION_TITLE}
      subtitle={i18n.SCOPE_SECTION_SUBTITLE}
      data-test-subj="pndWatchScopeRoutingSection"
    >
      {selects.map(({ key, label, helpText, setting, labels, testSubj }, index) => (
        <React.Fragment key={key}>
          {index > 0 ? <EuiSpacer size="m" /> : null}
          <EuiFormRow label={label} helpText={helpText} fullWidth>
            <EuiSelect
              value={setting.selectedId}
              options={setting.optionIds.map((optionId) => ({
                value: optionId,
                text: labels[optionId] ?? optionId,
              }))}
              onChange={(event) => onSelectChange(key, event.target.value)}
              data-test-subj={testSubj}
              fullWidth
            />
          </EuiFormRow>
        </React.Fragment>
      ))}

      {scopes.length > 0 ? (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiText size="xs">
            <h4>{i18n.DATA_BOUNDARIES_TITLE}</h4>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiBadgeGroup gutterSize="xs">
            {scopes.map((scope) => (
              <EuiBadge
                key={scope.name}
                color="hollow"
                iconType="dot"
                iconSide="left"
                data-test-subj={`pndWatchDataBoundary-${scope.name}`}
                // The badge forces `color="inherit"` on its icon to match the label, so the dot is
                // re-coloured here to carry the access level.
                css={css`
                  .euiBadge__icon {
                    color: ${euiTheme.colors[ACCESS_ICON_COLOR[scope.access]]};
                  }
                `}
              >
                {`${scope.name} — ${scope.label}`}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        </>
      ) : null}
    </SettingsSection>
  );
};
