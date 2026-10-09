/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiMarkdownFormat,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { AttackDiscoveryMarkdownParser } from './attack_discovery_markdown_parser';
import { MarkdownFormatterContext } from './context';
import { FieldMarkdownRenderer } from './field_markdown_renderer';

interface Props {
  scopeId?: string;
  disableActions?: boolean;
  markdown: string;
  alertIds?: string[];
  /** Wraps long text and field chip values to fit narrow containers, e.g. a chat card. */
  wrapFieldValues?: boolean;
}

const wrappedMarkdownCss = css`
  min-width: 0;
  overflow-wrap: anywhere;
`;

const AttackDiscoveryMarkdownFormatterComponent: React.FC<Props> = ({
  scopeId,
  disableActions = false,
  markdown,
  alertIds,
  wrapFieldValues = false,
}) => {
  const attackDiscoveryParsingPluginList = useMemo(
    () => [...getDefaultEuiMarkdownParsingPlugins(), AttackDiscoveryMarkdownParser],
    []
  );

  const attackDiscoveryProcessingPluginList = useMemo(() => {
    const processingPluginList = getDefaultEuiMarkdownProcessingPlugins();
    processingPluginList[1][1].components.fieldPlugin = FieldMarkdownRenderer;

    return processingPluginList;
  }, []);

  const contextValue = useMemo(
    () => ({ disableActions, scopeId, alertIds, wrapFieldValues }),
    [alertIds, disableActions, scopeId, wrapFieldValues]
  );

  return (
    <MarkdownFormatterContext.Provider value={contextValue}>
      <EuiMarkdownFormat
        color="subdued"
        css={wrapFieldValues ? wrappedMarkdownCss : undefined}
        data-test-subj="attackDiscoveryMarkdownFormatter"
        parsingPluginList={attackDiscoveryParsingPluginList}
        processingPluginList={attackDiscoveryProcessingPluginList}
        textSize="xs"
      >
        {markdown}
      </EuiMarkdownFormat>
    </MarkdownFormatterContext.Provider>
  );
};
AttackDiscoveryMarkdownFormatterComponent.displayName = 'AttackDiscoveryMarkdownFormatter';

export const AttackDiscoveryMarkdownFormatter = React.memo(
  AttackDiscoveryMarkdownFormatterComponent
);
