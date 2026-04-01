/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GENERATION_SECTION_DESCRIPTION = i18n.translate(
  'xpack.discoveries.components.generationSectionDescription',
  {
    defaultMessage: 'Configure how Attack Discovery generates findings from retrieved alerts.',
  }
);

export const VALIDATION_SECTION_DESCRIPTION = i18n.translate(
  'xpack.discoveries.components.validationSectionDescription',
  {
    defaultMessage:
      'Choose how discoveries are validated or enriched before they are saved as attacks.',
  }
);

export const VALIDATION_ERRORS_TITLE = i18n.translate(
  'xpack.discoveries.components.validationErrorsTitle',
  {
    defaultMessage: 'Please fix the following issues to continue:',
  }
);

export const VALIDATION_WARNINGS_TITLE = i18n.translate(
  'xpack.discoveries.components.validationWarningsTitle',
  {
    defaultMessage: 'The following issues may affect execution:',
  }
);
