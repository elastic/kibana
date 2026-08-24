/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  budgetAppliesToMetric,
  budgetAppliesToPage,
  rumBudgetBreachKuery,
  rumBudgetTemplateLabel,
  type RumBudgetItem,
  type RumBudgetTemplateId,
} from '../../../../common/rum_budgets';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';

const statusColor = (
  status: RumBudgetItem['status']
): 'success' | 'warning' | 'danger' | 'hollow' => {
  switch (status) {
    case 'HEALTHY':
      return 'success';
    case 'DEGRADING':
      return 'warning';
    case 'VIOLATED':
      return 'danger';
    default:
      return 'hollow';
  }
};

const remainingLabel = (item: RumBudgetItem): string => {
  if (item.status === 'NO_DATA') {
    return i18n.translate('xpack.ux.budgets.chip.noDataLabel', { defaultMessage: 'no data' });
  }
  const remaining = Math.max(0, Math.round(item.errorBudgetRemaining * 100));
  return i18n.translate('xpack.ux.budgets.chip.remainingLabel', {
    defaultMessage: '{remaining}% left',
    values: { remaining },
  });
};

export function BudgetChips({
  items,
  templateId,
  templateIds,
  pagePath,
  includeAppWide = true,
}: {
  items: RumBudgetItem[];
  templateId?: RumBudgetTemplateId;
  templateIds?: readonly RumBudgetTemplateId[];
  pagePath?: string;
  includeAppWide?: boolean;
}) {
  const history = useHistory();
  const metricIds = templateIds ?? (templateId ? [templateId] : undefined);
  const visible = items.filter((item) => {
    if (metricIds && !metricIds.some((id) => budgetAppliesToMetric(item, id))) {
      return false;
    }
    return budgetAppliesToPage(item, pagePath, { includeAppWide });
  });
  if (visible.length === 0) {
    return null;
  }
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {visible.map((item) => {
        const metric = item.templateId ? rumBudgetTemplateLabel(item.templateId) : item.name;
        return (
          <EuiFlexItem grow={false} key={`${item.id}:${item.instanceId}`}>
            <EuiBadge
              color={statusColor(item.status)}
              title={item.name}
              onClickAriaLabel={i18n.translate('xpack.ux.budgets.chip.investigateAriaLabel', {
                defaultMessage: 'Investigate {name}',
                values: { name: item.name },
              })}
              onClick={() =>
                pushRumPath(
                  history,
                  '/session-replay',
                  sessionsPatch({
                    pageUrl: pagePath || item.pagePath || '',
                    kuery: rumBudgetBreachKuery(item),
                  })
                )
              }
            >
              {`${metric}: ${remainingLabel(item)}`}
            </EuiBadge>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
