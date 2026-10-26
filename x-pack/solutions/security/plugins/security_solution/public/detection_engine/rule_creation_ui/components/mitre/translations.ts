/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TACTIC = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.tacticsDescription',
  {
    defaultMessage: 'tactic',
  }
);

export const TECHNIQUE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.techniquesDescription',
  {
    defaultMessage: 'technique',
  }
);

export const SUBTECHNIQUE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.subtechniquesDescription',
  {
    defaultMessage: 'subtechnique',
  }
);

export const ADD_MITRE_TACTIC = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.addTacticTitle',
  {
    defaultMessage: 'Add tactic',
  }
);

export const ADD_MITRE_TECHNIQUE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.addTechniqueTitle',
  {
    defaultMessage: 'Add technique',
  }
);

export const ADD_MITRE_SUBTECHNIQUE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.addSubtechniqueTitle',
  {
    defaultMessage: 'Add subtechnique',
  }
);

export const TACTIC_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.tacticPlaceHolderDescription',
  {
    defaultMessage: 'Select a tactic ...',
  }
);

export const TECHNIQUE_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.techniquePlaceHolderDescription',
  {
    defaultMessage: 'Select a technique ...',
  }
);

export const SUBTECHNIQUE_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.subtechniquePlaceHolderDescription',
  {
    defaultMessage: 'Select a subtechnique ...',
  }
);

export const UNSUPPORTED_MITRE_OPTION_LABEL = (id: string, name: string | undefined): string => {
  if (name && name.trim().length > 0) {
    return i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttack.unsupportedOptionLabelWithName',
      {
        defaultMessage: '{name} ({id})',
        values: { id, name },
      }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.detectionEngine.mitreAttack.unsupportedOptionLabelIdOnly',
    {
      defaultMessage: '{id}',
      values: { id },
    }
  );
};

export const UNSUPPORTED_MITRE_ID_ERROR = (id: string, framework: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.mitreAttack.unsupportedIdErrorMessage', {
    defaultMessage:
      '"{id}" is not in the currently supported {framework} version. Choose a supported value.',
    values: { id, framework },
  });

export const RENAMED_FROM_HINT = (previousName: string, framework: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.mitreAttack.renamedFromHint', {
    defaultMessage: 'Renamed from "{previousName}" in the currently supported {framework} version.',
    values: { previousName, framework },
  });

export const TECHNIQUE_REASSIGNED_FROM_TACTIC_ERROR = (id: string, framework: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.mitreAttack.techniqueReassignedFromTacticError',
    {
      defaultMessage:
        '"{id}" is no longer assigned to the selected tactic in the currently supported {framework} version. Choose a valid tactic for this technique, or select a different technique.',
      values: { id, framework },
    }
  );

export const MITRE_LOADING_ERROR = (framework: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.mitreAttack.loadingError', {
    defaultMessage: 'Failed to load {framework} data. Refresh the page to try again.',
    values: { framework },
  });

export const ADD_FRAMEWORK = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.addFrameworkTitle',
  {
    defaultMessage: 'Add framework',
  }
);

export const REMOVE_FRAMEWORK = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.removeFrameworkTitle',
  {
    defaultMessage: 'Remove framework',
  }
);

export const UNKNOWN_FRAMEWORK_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.unknownFrameworkWarning',
  {
    defaultMessage:
      'This threat framework is not recognized. Its mappings are kept on the rule but cannot be edited here.',
  }
);

export const FRAMEWORK_UNAVAILABLE_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.mitreAttack.frameworkUnavailableWarning',
  {
    defaultMessage:
      'This framework is not available from the current MITRE data source. Its mappings are kept on the rule but cannot be edited here.',
  }
);
