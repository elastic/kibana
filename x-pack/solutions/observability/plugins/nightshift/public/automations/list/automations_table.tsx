/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable, EuiSwitch, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useToggleAutomation, type Automation } from '../hooks/use_automations';
import type { RunRange } from '../hooks/use_automation_usage';
import type { AutomationFacets } from '../utils/filter_automations';
import { AutomationAuthorCell } from './cells/author_cell';
import { AutomationNameCell } from './cells/name_cell';
import { AutomationActions } from './cells/row_actions';
import { AutomationRunsCell } from './cells/runs_cell';
import { AutomationUsageCell } from './cells/usage_cell';
import { listLabels } from './translations';

export const AutomationsTable = ({
  automations,
  canManage,
  runRange,
  runTotals,
  usedToday,
  getFacets,
  isRateLimited,
  onClone,
  onDelete,
  onOpenAutomation,
}: {
  automations: Automation[];
  canManage: boolean;
  runRange: RunRange;
  runTotals: Map<string, number>;
  usedToday: Map<string, number>;
  getFacets: (automation: Automation) => AutomationFacets;
  isRateLimited: (automation: Automation) => boolean;
  onClone: (automation: Automation) => void;
  onDelete: (automation: Automation) => void;
  onOpenAutomation: (automation: Automation) => void;
}) => {
  const toggleAutomation = useToggleAutomation();
  const getAuthorName = (automation: Automation) => getFacets(automation).author;

  const columns: Array<EuiBasicTableColumn<Automation>> = [
    {
      field: 'name',
      name: listLabels.automationColumn,
      sortable: true,
      render: (_name: string, automation: Automation) => (
        <AutomationNameCell
          automation={automation}
          isRateLimited={isRateLimited(automation)}
          onOpen={() => onOpenAutomation(automation)}
        />
      ),
    },
    {
      field: 'isEnabled',
      name: listLabels.enabled,
      width: '96px',
      sortable: true,
      render: (isEnabled: boolean, automation: Automation) => (
        <EuiSwitch
          label={i18n.translate('xpack.nightshift.automations.toggleLabel', {
            defaultMessage: '{action} {name}',
            values: { action: isEnabled ? 'Disable' : 'Enable', name: automation.name },
          })}
          showLabel={false}
          compressed
          checked={isEnabled}
          disabled={!canManage || toggleAutomation.isLoading}
          onChange={(event) =>
            toggleAutomation.mutate({ id: automation.id, isEnabled: event.target.checked })
          }
          data-test-subj={`automationToggle-${automation.id}`}
        />
      ),
    },
    {
      name: listLabels.author,
      width: '160px',
      sortable: getAuthorName,
      render: (automation: Automation) => <AutomationAuthorCell name={getAuthorName(automation)} />,
    },
    {
      name: listLabels.runs,
      nameTooltip: { content: listLabels.runsTooltip },
      width: '170px',
      sortable: (automation) => runTotals.get(automation.id) ?? 0,
      render: (automation: Automation) => <AutomationRunsCell id={automation.id} {...runRange} />,
    },
    {
      name: listLabels.usage,
      nameTooltip: { content: listLabels.usageTooltip },
      width: '180px',
      sortable: (automation) => usedToday.get(automation.id) ?? 0,
      render: (automation: Automation) => (
        <AutomationUsageCell
          used={usedToday.get(automation.id) ?? 0}
          limit={automation.runtime.dailyDispatchLimit}
        />
      ),
    },
    ...(canManage
      ? [
          {
            name: '',
            width: '40px',
            align: 'right' as const,
            render: (automation: Automation) => (
              <AutomationActions
                automation={automation}
                onClone={() => onClone(automation)}
                onDelete={() => onDelete(automation)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiInMemoryTable
      items={automations}
      columns={columns}
      sorting={{ sort: { field: 'name', direction: 'asc' } }}
      pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
      rowHeader="name"
      tableCaption={listLabels.title}
      tableLayout="auto"
      hasBackground={false}
      rowProps={(automation: Automation) => ({ onClick: () => onOpenAutomation(automation) })}
    />
  );
};
