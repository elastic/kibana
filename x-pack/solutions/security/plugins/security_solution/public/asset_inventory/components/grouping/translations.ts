/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ASSET_GROUPING_OPTIONS } from '../../constants';

export const assetsUnit = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.assetInventory.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {asset} other {assets}}`,
  });

export const assetGroupsUnit = (
  totalCount: number,
  selectedGroup: string,
  hasNullGroup: boolean
) => {
  const groupCount = hasNullGroup ? totalCount - 1 : totalCount;

  switch (selectedGroup) {
    case ASSET_GROUPING_OPTIONS.ASSET_CRITICALITY:
      return i18n.translate('xpack.securitySolution.assetInventory.groupUnit.assetCriticality', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {asset criticality} other {asset criticalities}}`,
      });
    case ASSET_GROUPING_OPTIONS.ENTITY_TYPE:
      return i18n.translate('xpack.securitySolution.assetInventory.groupUnit.entityType', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {entity type} other {entity types}}`,
      });
    case ASSET_GROUPING_OPTIONS.CLOUD_ACCOUNT:
      return i18n.translate('xpack.securitySolution.assetInventory.groupUnit.cloudAccount', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {cloud account} other {cloud accounts}}`,
      });
    default:
      return i18n.translate('xpack.securitySolution.assetInventory.groupUnit.default', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {group} other {groups}}`,
      });
  }
};

export const NULL_GROUPING_UNIT = i18n.translate(
  'xpack.securitySolution.assetInventory.grouping.nullGroupUnit',
  {
    defaultMessage: 'assets',
  }
);

export const NULL_GROUPING_MESSAGES = {
  ASSET_CRITICALITY: i18n.translate(
    'xpack.securitySolution.assetInventory.grouping.assetCriticality.nullGroupTitle',
    {
      defaultMessage: 'No asset criticality',
    }
  ),
  ENTITY_TYPE: i18n.translate(
    'xpack.securitySolution.assetInventory.grouping.entityType.nullGroupTitle',
    {
      defaultMessage: 'No entity type',
    }
  ),
  CLOUD_ACCOUNT: i18n.translate(
    'xpack.securitySolution.assetInventory.grouping.cloudAccount.nullGroupTitle',
    {
      defaultMessage: 'No cloud account',
    }
  ),
  DEFAULT: i18n.translate('xpack.securitySolution.assetInventory.grouping.default.nullGroupTitle', {
    defaultMessage: 'No grouping',
  }),
};

export const GROUPING_LABELS = {
  ASSET_CRITICALITY: i18n.translate(
    'xpack.securitySolution.assetInventory.groupBy.assetCriticality',
    {
      defaultMessage: 'Asset criticality',
    }
  ),
  ENTITY_TYPE: i18n.translate('xpack.securitySolution.assetInventory.groupBy.entityType', {
    defaultMessage: 'Entity type',
  }),
  CLOUD_ACCOUNT: i18n.translate('xpack.securitySolution.assetInventory.groupBy.cloudAccount', {
    defaultMessage: 'Cloud account',
  }),
};

export const groupingTitle = i18n.translate('xpack.securitySolution.assetInventory.groupBy', {
  defaultMessage: 'Group assets by',
});
