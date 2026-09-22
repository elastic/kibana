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
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ImpactAttachmentData, ImpactedEntity } from './types';

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

const isImpactedEntity = (value: unknown): value is ImpactedEntity =>
  typeof value === 'object' &&
  value !== null &&
  ((value as ImpactedEntity).entity_type === 'host' ||
    (value as ImpactedEntity).entity_type === 'user') &&
  typeof (value as ImpactedEntity).name === 'string' &&
  (value as ImpactedEntity).name.length > 0;

const parseEntities = (data: unknown): EntityRow[] => {
  if (typeof data !== 'object' || data === null) {
    return [];
  }
  const payload = data as { entities?: unknown };
  if (!Array.isArray(payload.entities)) {
    return [];
  }
  return payload.entities.filter(isImpactedEntity).map((e, i) => ({
    id: `${e.entity_type}-${e.name}-${i}`,
    entity_type: e.entity_type,
    name: e.name,
    alert_count: e.alert_count,
    true_positive: e.verdicts?.true_positive ?? 0,
    false_positive: e.verdicts?.false_positive ?? 0,
    inconclusive: e.verdicts?.inconclusive ?? 0,
  }));
};

const parseTruncation = (
  data: unknown
): { truncated: boolean; totalAlertCount: number | undefined } => {
  if (typeof data !== 'object' || data === null) {
    return { truncated: false, totalAlertCount: undefined };
  }
  const payload = data as ImpactAttachmentData;
  return {
    truncated: payload.truncated === true,
    totalAlertCount:
      typeof payload.total_alert_count === 'number' ? payload.total_alert_count : undefined,
  };
};

const COLUMNS: Array<EuiBasicTableColumn<EntityRow>> = [
  {
    field: 'entity_type',
    name: i18n.translate('xpack.securitySolution.agentBuilder.impact.typeColumn', {
      defaultMessage: 'Type',
    }),
    width: '5em',
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
    name: i18n.translate('xpack.securitySolution.agentBuilder.impact.tpColumn', {
      defaultMessage: 'TP',
    }),
    width: '4em',
  },
  {
    field: 'false_positive',
    name: i18n.translate('xpack.securitySolution.agentBuilder.impact.fpColumn', {
      defaultMessage: 'FP',
    }),
    width: '4em',
  },
  {
    field: 'inconclusive',
    name: i18n.translate('xpack.securitySolution.agentBuilder.impact.incColumn', {
      defaultMessage: 'Inc',
    }),
    width: '4em',
  },
];

/** Entity × verdict table for a `security.impact` attachment. */
export const ImpactInlineContent: React.FC<AttachmentRenderProps<Attachment<string, unknown>>> = ({
  attachment,
}) => {
  const rows = useMemo(() => parseEntities(attachment.data), [attachment.data]);
  const { truncated, totalAlertCount } = useMemo(
    () => parseTruncation(attachment.data),
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
