/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemarkTokenizer } from '@elastic/eui';
import type { ContentReferenceBlock } from '@kbn/elastic-assistant-common';
import type { Plugin } from 'unified';
import type { Node } from 'unist';

export interface ContentReferenceNode extends Node {
  type: 'contentReference';
  contentReferenceId: string;
  contentReferenceCount: number;
  contentReferenceBlock: ContentReferenceBlock;
}

/**
 * Parses `{reference(contentReferenceId)}` or ` {reference(contentReferenceId)}` (notice space prefix) into ContentReferenceNode
 */
export const ContentReferenceParser: Plugin = function ContentReferenceParser() {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

  let currentContentReferenceCount = 1;
  const contentReferenceCounts: Record<string, number> = {};

  const tokenizeCustomCitation: RemarkTokenizer = function tokenizeCustomCitation(
    eat,
    value,
    silent
  ) {
    const [match] = value.match(/^\s?{reference/) || [];
    if (!match) return false;

    if (value.includes('\n')) return false;

    if (value[match.length] !== '(') return false;

    let index = match.length;

    function readArg(open: string, close: string) {
      if (value[index] !== open) return '';
      index++;

      let body = '';
      let openBrackets = 0;

      for (; index < value.length; index++) {
        const char = value[index];
        if (char === close && openBrackets === 0) {
          index++;

          return body;
        } else if (char === close) {
          openBrackets--;
        } else if (char === open) {
          openBrackets++;
        }

        body += char;
      }

      return '';
    }

    const contentReferenceId = readArg('(', ')');

    const closeChar = value[index++];
    if (closeChar !== '}') return false;

    const now = eat.now();

    if (!contentReferenceId) {
      this.file.info('No content reference id found', {
        line: now.line,
        column: now.column + match.length + 1,
      });
    }

    if (!contentReferenceId) {
      return false;
    }

    if (silent) {
      return true;
    }

    now.column += match.length + 1;
    now.offset += match.length + 1;

    const contentReferenceBlock: ContentReferenceBlock = `{reference(${contentReferenceId})}`;

    const getContentReferenceCount = (id: string) => {
      if (id in contentReferenceCounts) {
        return contentReferenceCounts[id];
      }
      contentReferenceCounts[id] = currentContentReferenceCount++;
      return contentReferenceCounts[id];
    };

    const toEat = `${match.startsWith(' ') ? ' ' : ''}${contentReferenceBlock}`;

    return eat(toEat)({
      type: 'contentReference',
      contentReferenceId,
      contentReferenceCount: getContentReferenceCount(contentReferenceId),
      contentReferenceBlock,
    } as ContentReferenceNode);
  };

  tokenizeCustomCitation.notInLink = true;

  tokenizeCustomCitation.locator = (value, fromIndex) => {
    return 1 + (value.substring(fromIndex).match(/\s?{reference/)?.index ?? -2);
  };

  tokenizers.contentReference = tokenizeCustomCitation;
  methods.splice(methods.indexOf('text'), 0, 'contentReference');
};
