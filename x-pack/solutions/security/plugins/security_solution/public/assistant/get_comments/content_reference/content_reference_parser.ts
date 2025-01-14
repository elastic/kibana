/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemarkTokenizer } from '@elastic/eui';
import { ContentReferenceBlock } from '@kbn/elastic-assistant-common/impl/content_references/types';
import type { Plugin } from 'unified';
import type { Node } from 'unist';

export interface ContentReferenceNode extends Node {
  type: 'contentReference';
  contentReferenceId: string;
  contentReferenceCount: number;
  contentReferenceBlock: ContentReferenceBlock
}

const START_SIGNAL = '{reference';

/**
 * Parses `{reference(contentReferenceId)}` into ContentReferenceNode
 */
export const ContentReferenceParser: Plugin = function ContentReferenceParser() {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;
  
  let currentContentReferenceCount = 1;
  const contentReferenceCounts: Record<string, number> = {}

  const tokenizeCustomCitation: RemarkTokenizer = function tokenizeCustomCitation(
    eat,
    value,
    silent
  ) {
    if (value.startsWith(START_SIGNAL) === false) return false;

    if (value.includes('\n')) return false;

    const nextChar = value[START_SIGNAL.length];

    if (nextChar !== '(') return false;

    let index = START_SIGNAL.length;

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

      return "";
    }

    const contentReferenceId = readArg('(', ')');

    if(contentReferenceId.length > 10){
        // The contentReferenceId is very long. This is probably an invalid content reference.
        return false
    }

    const lastChar = value[index];
    if(lastChar !== '}') return false

    const now = eat.now();

    if (!contentReferenceId) {
      this.file.info('No content reference id found', {
        line: now.line,
        column: now.column + START_SIGNAL.length + 1,
      });
    }


    if (!contentReferenceId) {
      return false
    }

    if (silent) {
      return true;
    }

    now.column += START_SIGNAL.length + 1;
    now.offset += START_SIGNAL.length + 1;

    const contentReferenceBlock: ContentReferenceBlock = `{reference(${contentReferenceId})}`;
    
    const getContentReferenceCount = (id: string) => {
        if(id in contentReferenceCounts) {
            return contentReferenceCounts[id]
        }
        contentReferenceCounts[id] = currentContentReferenceCount++
        return contentReferenceCounts[id]
    }

    return eat(contentReferenceBlock)({
      type: 'contentReference',
      contentReferenceId: contentReferenceId,
      contentReferenceCount: getContentReferenceCount(contentReferenceId),
      contentReferenceBlock
    } as ContentReferenceNode);
  };

  tokenizeCustomCitation.notInLink = true;

  tokenizeCustomCitation.locator = (value, fromIndex) => {
    return value.indexOf(START_SIGNAL, fromIndex);
  };

  tokenizers.contentReference = tokenizeCustomCitation;
  methods.splice(methods.indexOf('text'), 0, 'contentReference');
};