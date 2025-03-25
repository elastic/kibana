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
    case ASSET_GROUPING_OPTIONS.ASSET_TYPE:
      return i18n.translate('xpack.securitySolution.assetInventory.groupUnit.assetType', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {asset type} other {asset types}}`,
      });
    case ASSET_GROUPING_OPTIONS.ASSET_CATEGORY:
      return i18n.translate('xpack.securitySolution.assetInventory.groupUnit.assetCategory', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {asset category} other {asset categories}}`,
      });
    case ASSET_GROUPING_OPTIONS.RISK:
      return i18n.translate('xpack.securitySolution.assetInventory.groupUnit.risk', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {risk} other {risks}}`,
      });
    case ASSET_GROUPING_OPTIONS.CRITICALITY:
      return i18n.translate('xpack.securitySolution.assetInventory.groupUnit.criticality', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {criticality} other {criticalities}}`,
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
  ASSET_TYPE: i18n.translate(
    'xpack.securitySolution.assetInventory.grouping.assetType.nullGroupTitle',
    {
      defaultMessage: 'No asset type',
    }
  ),
  ASSET_CATEGORY: i18n.translate(
    'xpack.securitySolution.assetInventory.grouping.assetCategory.nullGroupTitle',
    {
      defaultMessage: 'No asset category',
    }
  ),
  RISK: i18n.translate('xpack.securitySolution.assetInventory.grouping.risk.nullGroupTitle', {
    defaultMessage: 'No risk',
  }),
  CRITICALITY: i18n.translate(
    'xpack.securitySolution.assetInventory.grouping.criticality.nullGroupTitle',
    {
      defaultMessage: 'No criticality',
    }
  ),
  DEFAULT: i18n.translate('xpack.securitySolution.assetInventory.grouping.default.nullGroupTitle', {
    defaultMessage: 'No grouping',
  }),
};

export const GROUPING_LABELS = {
  ASSET_TYPE: i18n.translate('xpack.securitySolution.assetInventory.groupBy.assetType', {
    defaultMessage: 'Asset type',
  }),
  ASSET_CATEGORY: i18n.translate('xpack.securitySolution.assetInventory.groupBy.assetCategory', {
    defaultMessage: 'Asset category',
  }),
  RISK: i18n.translate('xpack.securitySolution.assetInventory.groupBy.risk', {
    defaultMessage: 'Risk',
  }),
  CRITICALITY: i18n.translate('xpack.securitySolution.assetInventory.groupBy.criticality', {
    defaultMessage: 'Criticality',
  }),
};

export const groupingTitle = i18n.translate('xpack.securitySolution.assetInventory.groupBy', {
  defaultMessage: 'Group assets by',
});
