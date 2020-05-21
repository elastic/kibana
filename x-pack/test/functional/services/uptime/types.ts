/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AutoSuggestInteraction {
  /**
   * Text to prepend to typeahead interaction before navigating
   * suggestions.
   */
  autocompleteText?: string;
  /**
   * Suggestion key to assert for after interaction concludes.
   */
  suggestionKey?: string;
  /**
   * Set of keypresses to enter for navigation of typeahead
   * suggestions.
   */
  keyPresses: string[];
}
