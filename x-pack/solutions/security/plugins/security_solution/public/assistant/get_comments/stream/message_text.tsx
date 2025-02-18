/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiTable,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableHeaderCell,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Code, InlineCode, Parent, Text } from 'mdast';
import React, { useMemo } from 'react';
import type { Node } from 'unist';
import { customCodeBlockLanguagePlugin } from '../custom_codeblock/custom_codeblock_markdown_plugin';
import { CustomCodeBlock } from '../custom_codeblock/custom_code_block';
import { contentReferenceParser } from '../content_reference/content_reference_parser';
import type { StreamingOrFinalContentReferences } from '../content_reference/components/content_reference_component_factory';
import { ContentReferenceComponentFactory } from '../content_reference/components/content_reference_component_factory';

interface Props {
  content: string;
  contentReferences: StreamingOrFinalContentReferences;
  contentReferencesVisible: boolean;
  contentReferencesEnabled: boolean;
  index: number;
  loading: boolean;
  ['data-test-subj']?: string;
}

const ANIMATION_TIME = 1;

export const Cursor = () => {
  const { euiTheme } = useEuiTheme();

  const cursorCss = css`
    @keyframes blink {
      0% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }

    width: 10px;
    height: 16px;
    vertical-align: middle;
    display: inline-block;
    animation: blink ${ANIMATION_TIME}s infinite;
    background: ${euiTheme.colors.backgroundLightText};
  `;

  return <span data-test-subj="cursor" key="cursor" css={cursorCss} />;
};

// a weird combination of different whitespace chars to make sure it stays
// invisible even when we cannot properly parse the text while still being
// unique
const CURSOR = ` ᠎  `;

const loadingCursorPlugin = () => {
  const visitor = (node: Node, parent?: Parent) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child, nodeAsParent);
      });
    }

    if (node.type !== 'text' && node.type !== 'inlineCode' && node.type !== 'code') {
      return;
    }

    const textNode = node as Text | InlineCode | Code;

    const indexOfCursor = textNode.value.indexOf(CURSOR);
    if (indexOfCursor === -1) {
      return;
    }

    textNode.value = textNode.value.replace(CURSOR, '');

    const indexOfNode = parent?.children.indexOf(textNode) ?? 0;
    parent?.children.splice(indexOfNode + 1, 0, {
      type: 'cursor' as Text['type'],
      value: CURSOR,
    });
  };

  return (tree: Node) => {
    visitor(tree);
  };
};

interface GetPluginDependencies {
  contentReferences: StreamingOrFinalContentReferences;
  contentReferencesVisible: boolean;
  contentReferencesEnabled: boolean;
}

const getPluginDependencies = ({
  contentReferences,
  contentReferencesVisible,
  contentReferencesEnabled,
}: GetPluginDependencies) => {
  const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();

  const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();

  const { components } = processingPlugins[1][1];

  processingPlugins[1][1].components = {
    ...components,
    ...(contentReferencesEnabled
      ? {
          contentReference: (contentReferenceNode) => {
            return (
              <ContentReferenceComponentFactory
                contentReferencesVisible={contentReferencesVisible}
                contentReferenceNode={contentReferenceNode}
              />
            );
          },
        }
      : {}),
    cursor: Cursor,
    customCodeBlock: (props) => {
      return (
        <>
          <CustomCodeBlock value={props.value} />
          <EuiSpacer size="m" />
        </>
      );
    },
    table: (props) => (
      <>
        <EuiTable {...props} />
        <EuiSpacer size="m" />
      </>
    ),
    th: (props) => {
      const { children, ...rest } = props;
      return <EuiTableHeaderCell {...rest}>{children}</EuiTableHeaderCell>;
    },
    tr: (props) => <EuiTableRow {...props} />,
    td: (props) => {
      const { children, ...rest } = props;
      return (
        <EuiTableRowCell truncateText={true} {...rest}>
          {children}
        </EuiTableRowCell>
      );
    },
  };

  return {
    parsingPluginList: [
      loadingCursorPlugin,
      customCodeBlockLanguagePlugin,
      ...parsingPlugins,
      ...(contentReferencesEnabled ? [contentReferenceParser({ contentReferences })] : []),
    ],
    processingPluginList: processingPlugins,
  };
};

export function MessageText({
  loading,
  content,
  contentReferences,
  contentReferencesVisible,
  contentReferencesEnabled,
  index,
  'data-test-subj': dataTestSubj,
}: Props) {
  const containerCss = css`
    overflow-wrap: anywhere;
  `;

  const { parsingPluginList, processingPluginList } = useMemo(
    () =>
      getPluginDependencies({
        contentReferences,
        contentReferencesVisible,
        contentReferencesEnabled,
      }),
    [contentReferences, contentReferencesVisible, contentReferencesEnabled]
  );

  return (
    <EuiText css={containerCss} data-test-subj={dataTestSubj}>
      <EuiMarkdownFormat
        // used by augmentMessageCodeBlocks
        className={`message-${index}`}
        data-test-subj={'messageText'}
        parsingPluginList={parsingPluginList}
        processingPluginList={processingPluginList}
        textSize="s"
      >
        {`${content}${loading ? CURSOR : ''}`}
      </EuiMarkdownFormat>
    </EuiText>
  );
}
