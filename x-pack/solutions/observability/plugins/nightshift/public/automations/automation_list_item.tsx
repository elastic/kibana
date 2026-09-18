/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AutomationRecord } from '../hooks/use_fetch_automations';
import { useUpdateAutomation } from '../hooks/use_update_automation';
import { useDeleteAutomation } from '../hooks/use_delete_automation';

function getTriggerRows(trigger: AutomationRecord['trigger']): Array<{ kind?: string }> {
  if (
    typeof trigger === 'object' &&
    trigger !== null &&
    'rows' in trigger &&
    Array.isArray(trigger.rows)
  ) {
    return trigger.rows;
  }
  return [];
}

function triggerSummary(record: AutomationRecord): string {
  const rows = getTriggerRows(record.trigger);

  if (rows.length === 0) return '';

  const kinds = [...new Set(rows.map((r) => r.kind).filter(Boolean))];
  const kindLabels: Record<string, string> = {
    significant_event: i18n.translate(
      'xpack.nightshift.automations.listItem.triggerSigEvent',
      { defaultMessage: 'Significant events' }
    ),
    alert: i18n.translate('xpack.nightshift.automations.listItem.triggerAlert', {
      defaultMessage: 'Alerts',
    }),
    schedule: i18n.translate('xpack.nightshift.automations.listItem.triggerSchedule', {
      defaultMessage: 'Schedule',
    }),
  };

  return kinds.map((k) => (k && kindLabels[k]) ?? k ?? '').join(', ');
}

export function AutomationListItem({
  automation,
}: {
  automation: AutomationRecord;
}): React.ReactElement {
  const history = useHistory();
  const { mutate: updateAutomation, isLoading: isUpdating } = useUpdateAutomation();
  const { mutate: deleteAutomation, isLoading: isDeleting } = useDeleteAutomation();

  const handleToggle = () => {
    updateAutomation({ id: automation.id, updates: { isEnabled: !automation.isEnabled } });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      i18n.translate('xpack.nightshift.automations.listItem.deleteConfirm', {
        defaultMessage: 'Delete automation "{name}"?',
        values: { name: automation.name },
      })
    );
    if (confirmed) {
      deleteAutomation(automation.id);
    }
  };

  const summary = triggerSummary(automation);

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj="nightshiftAutomationListItem"
      onClick={() => history.push(`/automations/${automation.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{automation.name}</strong>
              </EuiText>
            </EuiFlexItem>
            {summary && (
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="xs" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{summary}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {automation.description && (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {automation.description}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={(e) => e.stopPropagation()}>
          <EuiSwitch
            label={i18n.translate('xpack.nightshift.automations.listItem.enabledLabel', {
              defaultMessage: 'Enabled',
            })}
            checked={automation.isEnabled}
            onChange={handleToggle}
            disabled={isUpdating}
            compressed
            data-test-subj="nightshiftAutomationEnabledToggle"
          />
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            aria-label={i18n.translate(
              'xpack.nightshift.automations.listItem.deleteAriaLabel',
              { defaultMessage: 'Delete automation' }
            )}
            onClick={handleDelete}
            isLoading={isDeleting}
            data-test-subj="nightshiftAutomationDelete"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
