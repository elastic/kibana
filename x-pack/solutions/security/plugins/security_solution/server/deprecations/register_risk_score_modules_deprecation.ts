/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  DeprecationsServiceSetup,
  DocLinksServiceSetup,
  IScopedClusterClient,
} from '@kbn/core/server';

interface Dependencies {
  deprecationsService: DeprecationsServiceSetup;
  docLinks: DocLinksServiceSetup;
}

/*
 * Deprecations are not space aware, so we look for the presence of the legacy risk engine in at least one space.
 * This is done by checking if at least one legacy transform is present.
 * Legacy transforms are deleted as part of the upgrade process, so if they are present, the user has not yet upgraded.
 */
const isModuleInAtLeastOneSpace = async ({
  esClient,
}: {
  esClient: IScopedClusterClient;
}): Promise<boolean> => {
  // space is the last part of the transform id
  const transformPrefixes = [
    'ml_hostriskscore_pivot_transform_*',
    'ml_hostriskscore_latest_transform_*',
    'ml_userriskscore_pivot_transform_*',
    'ml_userriskscore_latest_transform_*',
  ];

  const { transforms } = await esClient.asInternalUser.transform.getTransform({
    transform_id: transformPrefixes,
    size: 1,
  });

  return transforms.length > 0;
};

export const registerRiskScoreModulesDeprecation = ({
  deprecationsService,
  docLinks,
}: Dependencies) => {
  deprecationsService.registerDeprecations({
    getDeprecations: async ({ esClient }) => {
      if (!(await isModuleInAtLeastOneSpace({ esClient }))) {
        return [];
      }

      return [
        {
          documentationUrl:
            docLinks.links.securitySolution.entityAnalytics.legacyRiskScoreModuleDeprecation,
          title: i18n.translate('xpack.securitySolution.deprecations.riskScoreModules.title', {
            defaultMessage: 'The original user and host risk score modules are deprecated.',
          }),
          message: i18n.translate('xpack.securitySolution.deprecations.riskScoreModules.message', {
            defaultMessage: `We have detected that you have the original user and host risk score modules installed in at least one space. These modules are deprecated, and your risk score data will not be displayed after you upgrade (your data will not be deleted). Please migrate to the latest risk engine in each space before upgrading.`,
          }),
          level: 'warning',
          deprecationType: 'feature',
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.securitySolution.deprecations.riskScoreModules.manualStep1', {
                defaultMessage: 'In the main menu, go to Security > Manage > Entity Risk Score.',
              }),
              i18n.translate('xpack.securitySolution.deprecations.riskScoreModules.manualStep3', {
                defaultMessage:
                  'If the original user and host risk score modules are enabled, you\'ll see a button to "Start update". Click the button, and follow the instructions.',
              }),
            ],
          },
        },
      ];
    },
  });
};
