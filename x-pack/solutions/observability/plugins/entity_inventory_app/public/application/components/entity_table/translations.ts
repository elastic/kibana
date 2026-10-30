/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NAME_COLUMN_ID } from './entity_type_config';

/** Display labels of the output columns, keyed by column name. */
export const COLUMN_LABELS: Readonly<Record<string, string>> = {
  [NAME_COLUMN_ID]: i18n.translate('xpack.entityInventoryApp.entityTable.columns.name', {
    defaultMessage: 'Name',
  }),
  'entity.id': i18n.translate('xpack.entityInventoryApp.entityTable.columns.entityId', {
    defaultMessage: 'Entity ID',
  }),
  'host.id': i18n.translate('xpack.entityInventoryApp.entityTable.columns.hostId', {
    defaultMessage: 'Host ID',
  }),
  'host.name': i18n.translate('xpack.entityInventoryApp.entityTable.columns.hostName', {
    defaultMessage: 'Host name',
  }),
  'host.hostname': i18n.translate('xpack.entityInventoryApp.entityTable.columns.hostname', {
    defaultMessage: 'Hostname',
  }),
  'os.type': i18n.translate('xpack.entityInventoryApp.entityTable.columns.osType', {
    defaultMessage: 'OS type',
  }),
  'os.name': i18n.translate('xpack.entityInventoryApp.entityTable.columns.osName', {
    defaultMessage: 'OS name',
  }),
  'os.version': i18n.translate('xpack.entityInventoryApp.entityTable.columns.osVersion', {
    defaultMessage: 'OS version',
  }),
  'host.os.kernel': i18n.translate('xpack.entityInventoryApp.entityTable.columns.kernel', {
    defaultMessage: 'Kernel',
  }),
  'host.arch': i18n.translate('xpack.entityInventoryApp.entityTable.columns.architecture', {
    defaultMessage: 'Architecture',
  }),
  'host.ip': i18n.translate('xpack.entityInventoryApp.entityTable.columns.ipAddresses', {
    defaultMessage: 'IP addresses',
  }),
  'k8s.cluster.name': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.kubernetesCluster',
    { defaultMessage: 'Kubernetes cluster' }
  ),
  'cloud.provider': i18n.translate('xpack.entityInventoryApp.entityTable.columns.cloudProvider', {
    defaultMessage: 'Cloud provider',
  }),
  'cloud.platform': i18n.translate('xpack.entityInventoryApp.entityTable.columns.cloudPlatform', {
    defaultMessage: 'Cloud platform',
  }),
  'cloud.region': i18n.translate('xpack.entityInventoryApp.entityTable.columns.cloudRegion', {
    defaultMessage: 'Cloud region',
  }),
  'cloud.availability_zone': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.availabilityZone',
    { defaultMessage: 'Availability zone' }
  ),
  'cloud.account.id': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.cloudAccountId',
    { defaultMessage: 'Cloud account ID' }
  ),
  'kubernetes.namespace': i18n.translate('xpack.entityInventoryApp.entityTable.columns.namespace', {
    defaultMessage: 'Namespace',
  }),
  'kubernetes.deployment.name': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.deployment',
    { defaultMessage: 'Deployment' }
  ),
  cluster: i18n.translate('xpack.entityInventoryApp.entityTable.columns.cluster', {
    defaultMessage: 'Cluster',
  }),
  paused: i18n.translate('xpack.entityInventoryApp.entityTable.columns.paused', {
    defaultMessage: 'Paused',
  }),
  last_seen: i18n.translate('xpack.entityInventoryApp.entityTable.columns.lastSeen', {
    defaultMessage: 'Last seen',
  }),
};

/** The label of a column, or its raw name when the app has no label for it. */
export const getColumnLabel = (columnName: string): string =>
  COLUMN_LABELS[columnName] ?? columnName;

export const getTableAriaLabel = (typeName: string) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.ariaLabel', {
    defaultMessage: '{typeName} entities',
    values: { typeName },
  });

export const NO_VALUE_LABEL = i18n.translate('xpack.entityInventoryApp.entityTable.noValue', {
  defaultMessage: 'No value',
});

export const RESET_TO_DEFAULT_LABEL = i18n.translate(
  'xpack.entityInventoryApp.entityTable.resetToDefault',
  { defaultMessage: 'Reset to default' }
);

export const getTruncationTitle = ({ returned, total }: { returned: number; total: number }) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.truncation.title', {
    defaultMessage: 'Showing the {returned} most recently seen of {total} entities',
    values: { returned, total },
  });

export const getTruncationTotalUnknownTitle = ({ returned }: { returned: number }) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.truncation.totalUnknownTitle', {
    defaultMessage:
      'Showing the {returned} most recently seen entities. The total could not be counted.',
    values: { returned },
  });

export const TRUNCATION_BODY = i18n.translate(
  'xpack.entityInventoryApp.entityTable.truncation.body',
  {
    defaultMessage:
      'Only the returned entities are listed, and sorting covers only them. Narrow the time range or filter down to see the rest.',
  }
);

export const DIAGNOSTICS_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.diagnostics.title',
  { defaultMessage: 'Some data sources returned incomplete results' }
);

export const getSourceErrorText = ({
  indexPattern,
  status,
  reason,
}: {
  indexPattern: string;
  status: number | null;
  reason: string;
}) =>
  status === null
    ? i18n.translate('xpack.entityInventoryApp.entityTable.diagnostics.sourceError', {
        defaultMessage: '{indexPattern}: {reason}',
        values: { indexPattern, reason },
      })
    : i18n.translate('xpack.entityInventoryApp.entityTable.diagnostics.sourceErrorWithStatus', {
        defaultMessage: '{indexPattern} ({status}): {reason}',
        values: { indexPattern, status, reason },
      });

export const getUnavailableColumnText = ({
  column,
  indexPattern,
}: {
  column: string;
  indexPattern: string;
}) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.diagnostics.unavailableColumn', {
    defaultMessage: '{column} is not available in {indexPattern}',
    values: { column, indexPattern },
  });

export const LOADING_ENTITIES_LABEL = i18n.translate(
  'xpack.entityInventoryApp.entityTable.loading',
  { defaultMessage: 'Loading entities' }
);

export const LOAD_ERROR_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.loadError.title',
  { defaultMessage: 'Unable to load entities' }
);

export const RETRY_LABEL = i18n.translate('xpack.entityInventoryApp.entityTable.loadError.retry', {
  defaultMessage: 'Try again',
});

export const getTypeNotAvailableTitle = (entityType: string) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.typeNotAvailable.title', {
    defaultMessage: '{entityType} entities are not available',
    values: { entityType },
  });

export const getEmptyTitle = (typeName: string) =>
  i18n.translate('xpack.entityInventoryApp.entityTable.empty.title', {
    defaultMessage: 'No {typeName} entities found',
    values: { typeName },
  });

export const EMPTY_BODY = i18n.translate('xpack.entityInventoryApp.entityTable.empty.body', {
  defaultMessage: 'Try a different time range.',
});
