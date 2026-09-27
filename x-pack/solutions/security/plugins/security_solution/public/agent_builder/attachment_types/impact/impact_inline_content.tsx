/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { impactedEntitySchema } from '../../../../common/agent_builder/impact_attachment';

export const IMPACT_ATTACHMENT_TEST_ID = 'securitySolutionAgentBuilderImpactAttachment';
export const IMPACT_ATTACHMENT_TRUNCATED_TEST_ID =
  'securitySolutionAgentBuilderImpactAttachmentTruncated';

/** Flat table row — avoids nested field access in EuiBasicTable columns. */
interface EntityRow {
  id: string;
  entity_type: string;
  name: string;
  alert_count: number;
  true_positive: number;
  false_positive: number;
  inconclusive: number;
}

const formatEntityType = (entityType: string): string => {
  switch (entityType) {
    case 'host':
      return i18n.translate('xpack.securitySolution.agentBuilder.impact.entityTypeHost', {
        defaultMessage: 'Host',
      });
    case 'user':
      return i18n.translate('xpack.securitySolution.agentBuilder.impact.entityTypeUser', {
        defaultMessage: 'User',
      });
    default:
      return entityType;
  }
};

const parseTotalAlertCount = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }
  return undefined;
};

const parseImpactRows = (
  data: unknown
): { rows: EntityRow[]; truncated: boolean; totalAlertCount?: number } => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { rows: [], truncated: false };
  }
  const record = data as Record<string, unknown>;
  const rawEntities = Array.isArray(record.entities) ? record.entities : [];
  const rows = rawEntities.flatMap((entity, i) => {
    const parsed = impactedEntitySchema.safeParse(entity);
    if (!parsed.success) {
      return [];
    }
    const { entity_type, name, alert_count, verdicts } = parsed.data;
    return [
      {
        id: `${entity_type}-${name}-${i}`,
        entity_type,
        name,
        alert_count,
        true_positive: verdicts.true_positive,
        false_positive: verdicts.false_positive,
        inconclusive: verdicts.inconclusive,
      },
    ];
  });
  return {
    rows,
    truncated: record.truncated === true || record.truncated === 'true',
    totalAlertCount: parseTotalAlertCount(record.total_alert_count),
  };
};

const COLUMNS: Array<EuiBasicTableColumn<EntityRow>> = [
  {
    field: 'entity_type',
    name: i18n.translate('xpack.securitySolution.agentBuilder.impact.typeColumn', {
      defaultMessage: 'Type',
    }),
    width: '5em',
    render: (entityType: string) => formatEntityType(entityType),
  },
  {
    field: 'name',
    name: i18n.translate('xpack.securitySolution.agentBuilder.impact.nameColumn', {
      defaultMessage: 'Entity',
    }),
  },
  {
    field: 'alert_count',
    name: i18n.translate('xpack.securitySolution.agentBuilder.impact.alertsColumn', {
      defaultMessage: 'Alerts',
    }),
    width: '5em',
  },
  {
    field: 'true_positive',
    name: (
      <EuiToolTip
        content={i18n.translate('xpack.securitySolution.agentBuilder.impact.tpColumnTooltip', {
          defaultMessage: 'True positive',
        })}
      >
        <span tabIndex={0}>
          {i18n.translate('xpack.securitySolution.agentBuilder.impact.tpColumn', {
            defaultMessage: 'TP',
          })}
        </span>
      </EuiToolTip>
    ),
    width: '4em',
  },
  {
    field: 'false_positive',
    name: (
      <EuiToolTip
        content={i18n.translate('xpack.securitySolution.agentBuilder.impact.fpColumnTooltip', {
          defaultMessage: 'False positive',
        })}
      >
        <span tabIndex={0}>
          {i18n.translate('xpack.securitySolution.agentBuilder.impact.fpColumn', {
            defaultMessage: 'FP',
          })}
        </span>
      </EuiToolTip>
    ),
    width: '4em',
  },
  {
    field: 'inconclusive',
    name: (
      <EuiToolTip
        content={i18n.translate('xpack.securitySolution.agentBuilder.impact.incColumnTooltip', {
          defaultMessage: 'Inconclusive',
        })}
      >
        <span tabIndex={0}>
          {i18n.translate('xpack.securitySolution.agentBuilder.impact.incColumn', {
            defaultMessage: 'Inc',
          })}
        </span>
      </EuiToolTip>
    ),
    width: '4em',
  },
];

/** Entity × verdict table for a `security.impact` attachment. */
export const ImpactInlineContent: React.FC<AttachmentRenderProps<Attachment<string, unknown>>> = ({
  attachment,
}) => {
  const { rows, truncated, totalAlertCount } = useMemo(
    () => parseImpactRows(attachment.data),
    [attachment.data]
  );

  if (rows.length === 0) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="m"
        data-test-subj={IMPACT_ATTACHMENT_TEST_ID}
      >
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.agentBuilder.impact.empty"
            defaultMessage="No impacted entities recorded."
          />
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="s"
      data-test-subj={IMPACT_ATTACHMENT_TEST_ID}
    >
      {truncated ? (
        <>
          <KbnWarningCallout
            announceOnMount
            size="s"
            data-test-subj={IMPACT_ATTACHMENT_TRUNCATED_TEST_ID}
            title={i18n.translate('xpack.securitySolution.agentBuilder.impact.truncatedTitle', {
              defaultMessage: 'Impact list truncated',
            })}
            text={
              totalAlertCount !== undefined ? (
                <FormattedMessage
                  id="xpack.securitySolution.agentBuilder.impact.truncatedWithTotalBody"
                  defaultMessage="Showing {count} {count, plural, one {entity} other {entities}}. The full batch includes {totalAlertCount} {totalAlertCount, plural, one {alert} other {alerts}}."
                  values={{ count: rows.length, totalAlertCount }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.agentBuilder.impact.truncatedBody"
                  defaultMessage="Showing {count} {count, plural, one {entity} other {entities}}; additional impacted entities were omitted."
                  values={{ count: rows.length }}
                />
              )
            }
          />
          <EuiSpacer size="s" />
        </>
      ) : null}
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.securitySolution.agentBuilder.impact.tableCaption', {
          defaultMessage: 'Alert impact by entity',
        })}
        items={rows}
        columns={COLUMNS}
        itemId="id"
        tableLayout="auto"
        responsiveBreakpoint={false}
      />
    </EuiPanel>
  );
};
