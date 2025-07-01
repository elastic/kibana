/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemarkTokenizer } from '@elastic/eui';
import type { ContentReference, ContentReferenceBlock } from '@kbn/elastic-assistant-common';
import type { Plugin } from 'unified';
import type { Node } from 'unist';
import type { StreamingOrFinalContentReferences } from './components/content_reference_component_factory';

/** A ContentReferenceNode that has been extracted from the message and the content reference details are available. */
export interface ResolvedContentReferenceNode<T extends ContentReference> extends Node {
  type: 'contentReference';
  contentReferenceId: string;
  contentReferenceCount: number;
  contentReferenceBlock: ContentReferenceBlock;
  contentReference: T;
}

/** A ContentReferenceNode that has been extracted from the message but the content reference details are not available on the client **yet**. When the message finishes streaming, the details will become available. */
export interface UnresolvedContentReferenceNode extends Node {
  type: 'contentReference';
  contentReferenceId: string;
  contentReferenceCount: number;
  contentReferenceBlock: ContentReferenceBlock;
  contentReference: undefined;
}

/** A ContentReferenceNode that has been extracted from the message but the content reference details are erroneous. */
export interface InvalidContentReferenceNode extends Node {
  type: 'contentReference';
  contentReferenceId: string;
  contentReferenceCount: undefined;
  contentReferenceBlock: ContentReferenceBlock;
  contentReference: undefined;
}

export type ContentReferenceNode =
  | ResolvedContentReferenceNode<ContentReference>
  | UnresolvedContentReferenceNode
  | InvalidContentReferenceNode;

interface Params {
  contentReferences: StreamingOrFinalContentReferences;
}

/** Matches `{reference` and ` {reference(` */
const REFERENCE_START_PATTERN = '\\u0020?\\{reference';

export const contentReferenceParser: (params: Params) => Plugin = ({ contentReferences }) =>
  function ContentReferenceParser() {
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
      const [match] = value.match(new RegExp(`^${REFERENCE_START_PATTERN}`)) || [];

      if (!match) return false;

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

      const closeChar = value[index];
      if (closeChar !== '}') return false;

      const now = eat.now();

      if (!contentReferenceId) {
        this.file.info('No content reference id found', {
          line: now.line,
          column: now.column + match.length + 1,
        });
      }

      if (silent) {
        return true;
      }

      now.column += match.length + 1;
      now.offset += match.length + 1;

      const contentReferenceBlock: ContentReferenceBlock = `{reference(${contentReferenceId})}`;
      const contentReference = contentReferences?.[contentReferenceId];

      const getContentReferenceCount = () => {
        // If the content reference id is already in the contentReferenceCounts, return the existing count
        if (contentReferenceId in contentReferenceCounts) {
          return contentReferenceCounts[contentReferenceId];
        }
        // If the content reference id is not in the contentReferenceCounts, increment the currentContentReferenceCount and return the new count
        contentReferenceCounts[contentReferenceId] = currentContentReferenceCount++;
        return contentReferenceCounts[contentReferenceId];
      };

      const toEat = `${match.startsWith(' ') ? ' ' : ''}${contentReferenceBlock}`;

      if (contentReferences === null) {
        // The message is still streaming, so the content reference details are not available yet
        const contentReferenceNode: UnresolvedContentReferenceNode = {
          type: 'contentReference',
          contentReferenceId,
          contentReferenceCount: getContentReferenceCount(),
          contentReferenceBlock,
          contentReference: undefined,
        };

        return eat(toEat)(contentReferenceNode);
      }

      if (contentReference === undefined) {
        // The message has finished streaming, but the content reference details were not found
        const contentReferenceNode: InvalidContentReferenceNode = {
          type: 'contentReference',
          contentReferenceId,
          contentReferenceCount: undefined,
          contentReferenceBlock,
          contentReference,
        };

        return eat(toEat)(contentReferenceNode);
      }

      // The message has finished streaming and the content reference details were found
      const contentReferenceNode: ResolvedContentReferenceNode<ContentReference> = {
        type: 'contentReference',
        contentReferenceId,
        contentReferenceCount: getContentReferenceCount(),
        contentReferenceBlock,
        contentReference,
      };

      return eat(toEat)(contentReferenceNode);
    };

    tokenizeCustomCitation.notInLink = true;

    tokenizeCustomCitation.locator = (value, fromIndex) => {
      const nextIndex = value
        .substring(fromIndex)
        .match(new RegExp(REFERENCE_START_PATTERN))?.index;
      if (nextIndex === undefined) {
        return -1;
      }
      return nextIndex + 1;
    };

    tokenizers.contentReference = tokenizeCustomCitation;
    methods.splice(methods.indexOf('text'), 0, 'contentReference');
  };
