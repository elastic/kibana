/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const STEP_01_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step01.description',
  {
    defaultMessage: 'Highest recall, lowest precision setting.',
  }
);

const STEP_02_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step02.description',
  {
    defaultMessage:
      'Default: Less than half of the terms have to match. Full typo tolerance is applied.',
  }
);

const STEP_03_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step03.description',
  {
    defaultMessage:
      'Increased term requirements: To match, documents must contain all terms for queries with up to 2 terms, then half if there are more. Full typo tolerance is applied.',
  }
);

const STEP_04_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step04.description',
  {
    defaultMessage:
      'Increased term requirements: To match, documents must contain all terms for queries with up to 3 terms, then three-quarters if there are more. Full typo tolerance is applied.',
  }
);

const STEP_05_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step05.description',
  {
    defaultMessage:
      '	Increased term requirements: To match, documents must contain all terms for queries with up to 4 terms, then all but one if there are more. Full typo tolerance is applied.',
  }
);

const STEP_06_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step06.description',
  {
    defaultMessage:
      'Increased term requirements: To match, documents must contain all terms for any query. Full typo tolerance is applied.',
  }
);

const STEP_07_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step07.description',
  {
    defaultMessage:
      'Strictest term requirements: To match, documents must contain all terms in the same field. Full typo tolerance is applied.',
  }
);

const STEP_08_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step08.description',
  {
    defaultMessage:
      'Strictest term requirements: To match, documents must contain all terms in the same field. Partial typo tolerance is applied: fuzzy matching is disabled.',
  }
);

const STEP_09_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step09.description',
  {
    defaultMessage:
      'Strictest term requirements: To match, documents must contain all terms in the same field. Partial typo tolerance is applied: fuzzy matching and prefixing are disabled.',
  }
);

const STEP_10_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step10.description',
  {
    defaultMessage:
      'Strictest term requirements: To match, documents must contain all terms in the same field. Partial typo tolerance is applied: in addition to the above, contractions and hyphenations are not corrected.',
  }
);

const STEP_11_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step11.description',
  {
    defaultMessage:
      'Only exact matches will apply, with tolerance only for differences in capitalization.',
  }
);

export const STEP_DESCRIPTIONS = [
  undefined, // The precision number we get from the API starts with 1 instead of 0, so we leave this blank
  STEP_01_DESCRIPTION,
  STEP_02_DESCRIPTION,
  STEP_03_DESCRIPTION,
  STEP_04_DESCRIPTION,
  STEP_05_DESCRIPTION,
  STEP_06_DESCRIPTION,
  STEP_07_DESCRIPTION,
  STEP_08_DESCRIPTION,
  STEP_09_DESCRIPTION,
  STEP_10_DESCRIPTION,
  STEP_11_DESCRIPTION,
];
