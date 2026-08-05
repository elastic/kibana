/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const consoleTranslations = Object.freeze({
  escapeDoubleDashesInfo: i18n.translate(
    'xpack.securitySolution.management.console.escapeDoubleDashes',
    {
      defaultMessage:
        'Escape values with double dashes (--) as \\-\\-, unless they are command arguments; otherwise the console interprets them as arguments.',
    }
  ),
  keyTabInfo: i18n.translate(
    'xpack.securitySolution.management.console.keyTabToCompleteSuggestion',
    {
      defaultMessage:
        'Pressing the [TAB] key while a completion suggestion is displayed will complete the entered value with the suggestion.',
    }
  ),
  keyUpArrowInfo: i18n.translate('xpack.securitySolution.management.console.keyPressInputHistory', {
    defaultMessage: 'Pressing the [UP ARROW] key will show the list of last entered command.',
  }),
  keyAltSpaceInfo: i18n.translate(
    'xpack.securitySolution.management.console.keyAvailbleAutoCompleteValues',
    {
      defaultMessage:
        'Pressing [ALT][SPACE] keys will show list of available commands or list of available command arguments, if a command has alredy been entered.',
    }
  ),
});
