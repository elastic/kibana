/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import moment from 'moment';
import type { Parent, Text } from 'mdast';
import type { Node } from 'unist';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/** Kibana's default `dateFormat`, for when the UI settings are not available in context. */
const FALLBACK_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

const TIME_TAG_NAME = 'time';
const TIME_NODE_TYPE = 'nightshiftTime';

/** Matches `<time ...>` and `</time>`, but not other tags that start with "time". */
const TIME_TAG_START = /^<\/?time(?=[\s/>]|$)/i;
const OPEN_TAG = /^<time(\s[^>]*)?>$/i;
const CLOSE_TAG = /^<\/time\s*>$/i;
const COMPLETE_TAG = /<time(?=[\s/>])[^>]*?(?:\/>|>([^<]*)<\/time\s*>)/gi;
const DATETIME_ATTRIBUTE = /\sdatetime\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/i;

/** The moment for an ISO 8601 value that carries a time zone, or undefined for anything else. */
export const parseTimeTagDatetime = (value: string | undefined): moment.Moment | undefined => {
  if (!value || !ISO_WITH_ZONE.test(value)) return undefined;
  const parsed = moment(value, moment.ISO_8601, true);
  return parsed.isValid() ? parsed : undefined;
};

interface TimeNode extends Node {
  data: { hName: typeof TIME_TAG_NAME; hProperties: { dateTime: string } };
}

const createTextNode = (value: string, position: Node['position']): Text => ({
  type: 'text',
  value,
  position,
});

/** A time node for a tag with a usable `datetime`, else the text the tag should fall back to. */
const createTimeNode = ({
  openTag,
  raw,
  fallbackText,
  position,
}: {
  openTag: string;
  raw: string;
  fallbackText: string;
  position: Node['position'];
}): Node => {
  const [, doubleQuoted, singleQuoted] = DATETIME_ATTRIBUTE.exec(openTag) ?? [];
  const datetime = doubleQuoted ?? singleQuoted;
  if (!parseTimeTagDatetime(datetime)) {
    return createTextNode(fallbackText || raw, position);
  }
  const node: TimeNode = {
    type: TIME_NODE_TYPE,
    position,
    data: { hName: TIME_TAG_NAME, hProperties: { dateTime: datetime } },
  };
  return node;
};

/** Splits a block-level html node into time nodes and the text around them. */
const splitHtmlNode = (node: Node & { value: string }): Node[] => {
  const { value, position } = node;
  const replacements: Node[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(COMPLETE_TAG)) {
    const [raw, fallbackText = ''] = match;
    if (match.index > lastIndex) {
      replacements.push(createTextNode(value.slice(lastIndex, match.index), position));
    }
    replacements.push(
      createTimeNode({ openTag: raw.replace(/<\/time\s*>$/i, ''), raw, fallbackText, position })
    );
    lastIndex = match.index + raw.length;
  }

  if (replacements.length === 0) {
    // A tag that never completed (for example one cut off mid-stream) is shown as text.
    return TIME_TAG_START.test(value) ? [createTextNode(value, position)] : [node];
  }
  if (lastIndex < value.length) {
    replacements.push(createTextNode(value.slice(lastIndex), position));
  }
  return replacements;
};

const isHtmlNode = (node: Node | undefined): node is Node & { value: string } =>
  node?.type === 'html' && typeof (node as { value?: unknown }).value === 'string';

const isTextNode = (node: Node | undefined): node is Text => node?.type === 'text';

const transformChildren = (parent: Parent): void => {
  const { children } = parent;
  const result: Node[] = [];

  for (let index = 0; index < children.length; index++) {
    const child = children[index];

    if ('children' in child) {
      transformChildren(child as Parent);
    }
    if (!isHtmlNode(child) || !TIME_TAG_START.test(child.value.trimStart())) {
      result.push(child);
      continue;
    }

    // `<time datetime="..."></time>` and `<time datetime="...">fallback</time>` arrive as an
    // opening html node, an optional text node and a closing html node.
    const value = child.value.trim();
    const next = children[index + 1];
    const afterNext = children[index + 2];
    if (OPEN_TAG.test(value) && isHtmlNode(next) && CLOSE_TAG.test(next.value.trim())) {
      result.push(
        createTimeNode({
          openTag: value,
          raw: `${child.value}${next.value}`,
          fallbackText: '',
          position: child.position,
        })
      );
      index += 1;
    } else if (
      OPEN_TAG.test(value) &&
      isTextNode(next) &&
      isHtmlNode(afterNext) &&
      CLOSE_TAG.test(afterNext.value.trim())
    ) {
      result.push(
        createTimeNode({
          openTag: value,
          raw: `${child.value}${next.value}${afterNext.value}`,
          fallbackText: next.value,
          position: child.position,
        })
      );
      index += 2;
    } else {
      result.push(...splitHtmlNode(child));
    }
  }

  parent.children = result as Parent['children'];
};

/**
 * Remark plugin that turns `<time datetime="2026-11-24T17:20:00Z"></time>` into a time node.
 * A tag without a valid `datetime` becomes its inner text, or its raw text when it has none.
 */
export const markdownTimeParser = () => (tree: Node) => {
  if ('children' in tree) {
    transformChildren(tree as Parent);
  }
};

const useDateFormat = (): string => {
  const {
    services: { settings },
  } = useKibana();
  return settings?.client.get<string>('dateFormat') ?? FALLBACK_DATE_FORMAT;
};

/** A time from the agent's prose: relative in the text, absolute in the viewer's zone on hover. */
export const MarkdownTime = ({
  dateTime,
  children,
}: {
  dateTime?: string;
  children?: React.ReactNode;
}): React.ReactElement => {
  const dateFormat = useDateFormat();
  const parsed = parseTimeTagDatetime(dateTime);

  if (!parsed) {
    return <>{children}</>;
  }

  const tooltipContent = (
    <>
      <div>{parsed.format(dateFormat)}</div>
      <div>
        {i18n.translate('xpack.nightshift.markdownTime.utcValue', {
          defaultMessage: 'UTC: {value}',
          values: { value: parsed.clone().utc().format('YYYY-MM-DDTHH:mm:ss[Z]') },
        })}
      </div>
    </>
  );

  return (
    <EuiToolTip content={tooltipContent} disableScreenReaderOutput>
      <time
        dateTime={dateTime}
        data-test-subj="nightshiftMarkdownTime"
        tabIndex={0}
        css={css`
          text-decoration: underline dotted;
          text-underline-offset: 2px;
        `}
      >
        {parsed.fromNow()}
      </time>
    </EuiToolTip>
  );
};

export const markdownTimeComponents = { [TIME_TAG_NAME]: MarkdownTime };
