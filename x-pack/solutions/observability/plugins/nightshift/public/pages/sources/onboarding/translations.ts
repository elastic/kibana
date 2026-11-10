/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Tooltip when Generate is disabled because no source has been selected. */
export const GENERATE_NO_STREAM_SELECTED_TOOLTIP = i18n.translate(
  'xpack.nightshift.sources.generateNoSourceSelectedTooltip',
  { defaultMessage: 'Select at least one source to generate knowledge indicators.' }
);

/** Explains why generation is disabled, prioritizing activity status over selection. */
export const getGenerateDisabledTooltip = ({
  activityBlockTooltip,
  hasSelectedStreams,
}: {
  activityBlockTooltip: string | undefined;
  hasSelectedStreams: boolean;
}): string | undefined => {
  if (activityBlockTooltip) {
    return activityBlockTooltip;
  }
  if (!hasSelectedStreams) {
    return GENERATE_NO_STREAM_SELECTED_TOOLTIP;
  }
  return undefined;
};

export const GENERATE_FEATURES_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.streamsView.generateFeaturesButtonLabel',
  { defaultMessage: 'Generate KI Features' }
);

export const GENERATE_QUERIES_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.streamsView.generateQueriesButtonLabel',
  { defaultMessage: 'Generate KI Queries' }
);

export const CONNECTOR_LOAD_ERROR = i18n.translate(
  'xpack.nightshift.streamsView.connectorLoadError',
  { defaultMessage: 'Failed to load connectors' }
);

export const GENERATE_CONFIG_ARIA_LABEL = i18n.translate(
  'xpack.nightshift.streamsView.generateConfigAriaLabel',
  { defaultMessage: 'Configure generation steps and models' }
);

export const GENERATE_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.streamsView.generateButtonLabel',
  { defaultMessage: 'Generate' }
);

export const MODEL_SELECTION_PANEL_TITLE = i18n.translate(
  'xpack.nightshift.streamsView.modelSelectionPanelTitle',
  { defaultMessage: 'Model selection' }
);

export const DEFAULT_MODEL_BADGE_LABEL = i18n.translate(
  'xpack.nightshift.streamsView.defaultModelBadgeLabel',
  { defaultMessage: 'Default' }
);

export const MISSING_DEFAULT_MODEL_LABEL = i18n.translate(
  'xpack.nightshift.streamsView.missingDefaultModelLabel',
  { defaultMessage: 'Default model unavailable' }
);

export const MISSING_SELECTED_MODEL_LABEL = i18n.translate(
  'xpack.nightshift.streamsView.missingSelectedModelLabel',
  { defaultMessage: 'Selected model unavailable' }
);

export const SELECT_MODEL_LABEL = i18n.translate('xpack.nightshift.streamsView.selectModelLabel', {
  defaultMessage: 'Select a model',
});

export const CONFIGURED_DEFAULT_MODEL_CALLOUT_TITLE = i18n.translate(
  'xpack.nightshift.streamsView.configuredDefaultModelCalloutTitle',
  { defaultMessage: 'Configured default model only' }
);

export const CONFIGURED_DEFAULT_MODEL_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.nightshift.streamsView.configuredDefaultModelCalloutDescription',
  { defaultMessage: 'Generation succeeds only with the configured default model.' }
);

export const GENERATE_FEATURES_TOOLTIP = i18n.translate(
  'xpack.nightshift.sources.generateFeaturesTooltip',
  {
    defaultMessage:
      'Runs only feature identification on selected sources using the configured model.',
  }
);

export const GENERATE_QUERIES_TOOLTIP = i18n.translate(
  'xpack.nightshift.sources.generateQueriesTooltip',
  { defaultMessage: 'Runs only query generation on selected sources using the configured model.' }
);

/** Disclosure shown next to generation triggers when cross-project search is live. */
export const CROSS_PROJECT_GENERATION_DISCLOSURE = i18n.translate(
  'xpack.nightshift.streamsView.crossProjectGenerationDisclosure',
  {
    defaultMessage:
      'Generation analyzes data from all projects linked through cross-project search, regardless of the project scope configured for this space.',
  }
);
