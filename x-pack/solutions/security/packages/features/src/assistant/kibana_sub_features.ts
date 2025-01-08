/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { APP_ID } from '../constants';

const updateAnonymizationSubFeature: SubFeatureConfig = {
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.assistant.updateAnonymizationSubFeatureName',
    {
      defaultMessage: 'Field Selection and Anonymization',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.assistant.description',
    {
      defaultMessage:
        'Change the default fields that are allowed to be used by the AI Assistant and Attack discovery. Anonymize any of the content for the selected fields.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          api: [`${APP_ID}-updateAIAssistantAnonymization`],
          id: 'update_anonymization',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.assistant.updateAnonymizationSubFeatureDetails',
            {
              defaultMessage: 'Allow changes',
            }
          ),
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['updateAIAssistantAnonymization'],
        },
      ],
    },
  ],
};

const manageGlobalKnowledgeBaseSubFeature: SubFeatureConfig = {
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.assistant.manageGlobalKnowledgeBaseSubFeatureName',
    {
      defaultMessage: 'Knowledge Base',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.assistant.manageGlobalKnowledgeBaseSubFeatureDescription',
    {
      defaultMessage:
        'Make changes to any space level (global) custom knowledge base entries. This will also allow users to modify global entries created by other users.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          api: [`${APP_ID}-manageGlobalKnowledgeBaseAIAssistant`],
          id: 'manage_global_knowledge_base',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.assistant.manageGlobalKnowledgeBaseSubFeatureDetails',
            {
              defaultMessage: 'Allow Changes to Global Entries',
            }
          ),
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['manageGlobalKnowledgeBaseAIAssistant'],
        },
      ],
    },
  ],
};

export enum AssistantSubFeatureId {
  updateAnonymization = 'updateAnonymizationSubFeature',
  manageGlobalKnowledgeBase = 'manageGlobalKnowledgeBaseSubFeature',
}

/**
 * Sub-features that will always be available for Security Assistant
 * regardless of the product type.
 */
export const getAssistantBaseKibanaSubFeatureIds = (): AssistantSubFeatureId[] => [];

/**
 * Defines all the Security Assistant subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getAssistantSubFeaturesMap = (
  experimentalFeatures: Record<string, boolean>
): Map<AssistantSubFeatureId, SubFeatureConfig> => {
  const assistantSubFeaturesList: Array<[AssistantSubFeatureId, SubFeatureConfig]> = [
    [AssistantSubFeatureId.updateAnonymization, updateAnonymizationSubFeature],
    [AssistantSubFeatureId.manageGlobalKnowledgeBase, manageGlobalKnowledgeBaseSubFeature],
  ];

  // Use the following code to add feature based on feature flag
  // if (experimentalFeatures.featureFlagName) {
  //   assistantSubFeaturesList.push([AssistantSubFeatureId.featureId, featureSubFeature]);
  // }

  const assistantSubFeaturesMap = new Map<AssistantSubFeatureId, SubFeatureConfig>(
    assistantSubFeaturesList
  );

  return Object.freeze(assistantSubFeaturesMap);
};
