/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from 'unified';
import type { RemarkTokenizer } from '@elastic/eui';

export const OsqueryParser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  const tokenizeOsquery: RemarkTokenizer = function (eat, value, silent) {
    if (value.startsWith('!{osquery') === false) return false;

    const nextChar = value[9];

    if (nextChar !== '{' && nextChar !== '}') return false; // this isn't actually a osquery

    if (silent) {
      return true;
    }

    // is there a configuration?
    const hasConfiguration = nextChar === '{';

    let match = '!{osquery';
    let configuration = {};

    if (hasConfiguration) {
      let configurationString = '';

      let openObjects = 0;

      for (let i = 9; i < value.length; i++) {
        const char = value[i];
        if (char === '{') {
          openObjects++;
          configurationString += char;
        } else if (char === '}') {
          openObjects--;
          if (openObjects === -1) {
            break;
          }
          configurationString += char;
        } else {
          configurationString += char;
        }
      }

      match += configurationString;
      try {
        configuration = JSON.parse(configurationString);
      } catch (e) {
        const now = eat.now();
        this.file.fail(`Unable to parse osquery JSON configuration: ${e}`, {
          line: now.line,
          column: now.column + 9,
        });
      }
    }

    match += '}';

    return eat(match)({
      type: 'osquery',
      configuration,
    });
  };

  tokenizers.osquery = tokenizeOsquery;
  methods.splice(methods.indexOf('text'), 0, 'osquery');
};
