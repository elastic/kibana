/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from 'unified';
import type { RemarkTokenizer } from '@elastic/eui';

import { getIconFromFieldName } from './helpers';
import type { ParsedField } from '../types';

export const AttackDiscoveryMarkdownParser: Plugin = function () {
  // NOTE: the use of `this.Parse` and the other idioms below required by the Remark `Plugin` should NOT be replicated outside this file
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

  const START_DELIMITER = '{{';
  const END_DELIMITER = '}}';

  // function to parse a matching string
  const tokenizeField: RemarkTokenizer = function (eat, value, silent) {
    if (value.startsWith(START_DELIMITER) === false) return false;

    // match the entire contents between the {{ and }}
    const tokenMatch = value.match(/^{{(.*?)}}/);

    if (!tokenMatch) return false; // no match
    const [entireMatch, rawContent] = tokenMatch; // everything between the {{ and }}

    const parsedMatch = entireMatch.match(/^{{\s*(\S*)\s+(.*?)\s?}}/);
    if (!parsedMatch) return false; // no match

    const [_, fieldName, fieldValue] = parsedMatch;

    if (silent) {
      return true;
    }

    const parsedField: ParsedField = {
      name: fieldName,
      icon: getIconFromFieldName(fieldName),
      operator: ':',
      value: fieldValue,
    };

    // must consume the exact & entire match string
    return eat(`${START_DELIMITER}${rawContent}${END_DELIMITER}`)({
      type: 'fieldPlugin',
      ...parsedField,
    });
  };

  // function to detect where the next field match might be found
  tokenizeField.locator = (value, fromIndex) => {
    return value.indexOf(START_DELIMITER, fromIndex);
  };

  // define the field plugin and inject it just before the existing text plugin
  tokenizers.field = tokenizeField;
  methods.splice(methods.indexOf('text'), 0, 'field');
};
