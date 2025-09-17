/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { APP_ID } from '../constants';

const updateScheduleSubFeature: SubFeatureConfig = {
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.attackDiscovery.updateScheduleSubFeatureName',
    {
      defaultMessage: 'Attack discovery schedules',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.attackDiscovery.description',
    {
      defaultMessage: 'Create new and update existing Attack Discovery schedules.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          api: [`${APP_ID}-updateAttackDiscoverySchedule`],
          id: 'update_schedule',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.attackDiscovery.updateScheduleSubFeatureDetails',
            {
              defaultMessage: 'Allow changes',
            }
          ),
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['updateAttackDiscoverySchedule'],
        },
      ],
    },
  ],
};

export enum AttackDiscoverySubFeatureId {
  updateSchedule = 'updateScheduleSubFeature',
}

/**
 * Sub-features that will always be available for Security Attack discovery
 * regardless of the product type.
 */
export const getAttackDiscoveryBaseKibanaSubFeatureIds = (): AttackDiscoverySubFeatureId[] => [];

/**
 * Defines all the Security Attack discovery subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getAttackDiscoverySubFeaturesMap = (
  experimentalFeatures: Record<string, boolean>
): Map<AttackDiscoverySubFeatureId, SubFeatureConfig> => {
  const attackDiscoverySubFeaturesList: Array<[AttackDiscoverySubFeatureId, SubFeatureConfig]> = [
    [AttackDiscoverySubFeatureId.updateSchedule, updateScheduleSubFeature],
  ];

  // Use the following code to add feature based on feature flag
  // if (experimentalFeatures.featureFlagName) {
  //   attackDiscoverySubFeaturesList.push([AttackDiscoverySubFeatureId.featureId, featureSubFeature]);
  // }

  const attackDiscoverySubFeaturesMap = new Map<AttackDiscoverySubFeatureId, SubFeatureConfig>(
    attackDiscoverySubFeaturesList
  );

  return Object.freeze(attackDiscoverySubFeaturesMap);
};
