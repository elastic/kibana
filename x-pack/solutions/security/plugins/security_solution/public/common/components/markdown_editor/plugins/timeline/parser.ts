/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from 'unified';
import type { RemarkTokenizer } from '@elastic/eui';
import { safeDecode } from '@kbn/rison';
import { parse } from 'query-string';

import { ID, PREFIX } from './constants';
import * as i18n from './translations';

export const TimelineParser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

  const parseTimeline: RemarkTokenizer = function (eat, value, silent) {
    let index = 0;
    const nextChar = value[index];

    if (nextChar !== '[') {
      return false;
    }

    if (silent) {
      return true;
    }

    function readArg(open: string, close: string) {
      if (value[index] !== open) {
        throw new Error(i18n.NO_PARENTHESES);
      }

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

    const timelineTitle = readArg('[', ']');
    const timelineUrl = readArg('(', ')');
    const now = eat.now();

    if (!timelineTitle) {
      this.file.info(i18n.NO_TIMELINE_NAME_FOUND, {
        line: now.line,
        column: now.column,
      });
      return false;
    }

    try {
      const timelineSearch = timelineUrl.split('?');
      const parseTimelineUrlSearch = parse(timelineSearch[1]) as { timeline: string };
      const decodedTimeline = safeDecode(parseTimelineUrlSearch.timeline ?? '') as {
        id?: string;
        graphEventId?: string;
      } | null;
      const { id: timelineId = '', graphEventId = '' } = decodedTimeline ?? {
        id: null,
        graphEventId: '',
      };

      if (!timelineId) {
        this.file.info(i18n.NO_TIMELINE_ID_FOUND, {
          line: now.line,
          column: now.column + timelineUrl.indexOf('id'),
        });
        return false;
      }

      return eat(`[${timelineTitle}](${timelineUrl})`)({
        type: ID,
        id: timelineId,
        title: timelineTitle,
        graphEventId,
      });
    } catch {
      this.file.info(i18n.TIMELINE_URL_IS_NOT_VALID(timelineUrl), {
        line: now.line,
        column: now.column,
      });
    }

    return false;
  };

  const tokenizeTimeline: RemarkTokenizer = function tokenizeTimeline(eat, value, silent) {
    if (
      value.startsWith(PREFIX) === false ||
      (value.startsWith(PREFIX) === true && !value.includes('timelines?timeline=(id'))
    ) {
      return false;
    }

    return parseTimeline.call(this, eat, value, silent);
  };

  tokenizeTimeline.locator = (value: string, fromIndex: number) => {
    return value.indexOf(PREFIX, fromIndex);
  };

  tokenizers.timeline = tokenizeTimeline;
  methods.splice(methods.indexOf('url'), 0, ID);
};
