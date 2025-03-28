/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsOf } from '@elastic/eui';
import { EuiCodeBlock, EuiPage, EuiPageBody, EuiPanel } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import React from 'react';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { MockIndexPatternSpec } from '../../../hooks/use_kibana_index_patterns.mock';
import { MockIndexPatternsKibanaContextProvider } from '../../../hooks/use_kibana_index_patterns.mock';
import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';
import type { LogIndicesFormState } from './indices_configuration_form_state';
import { useLogIndicesFormElement } from './indices_configuration_form_state';
import { IndicesConfigurationPanel } from './indices_configuration_panel';

export default {
  title: 'infra/logsSettings/indicesConfiguration',
  decorators: [
    (WrappedStory, { args }) => {
      return (
        <I18nProvider>
          <MockIndexPatternsKibanaContextProvider
            asyncDelay={2000}
            mockIndexPatterns={args.availableIndexPatterns}
          >
            <EuiPage restrictWidth>
              <EuiPageBody>
                <EuiPanel>
                  <WrappedStory />
                </EuiPanel>
              </EuiPageBody>
            </EuiPage>
          </MockIndexPatternsKibanaContextProvider>
        </I18nProvider>
      );
    },
    decorateWithGlobalStorybookThemeProviders,
  ],
  argTypes: {
    logIndices: {
      control: {
        type: 'object',
      },
    },
    availableIndexPatterns: {
      control: {
        type: 'object',
      },
    },
  },
} as Meta;

type IndicesConfigurationPanelProps = PropsOf<typeof IndicesConfigurationPanel>;

type IndicesConfigurationPanelStoryArgs = Pick<
  IndicesConfigurationPanelProps,
  'isLoading' | 'isReadOnly' | 'logViewStatus'
> & {
  availableIndexPatterns: MockIndexPatternSpec[];
  logIndices: LogIndicesFormState;
};

const IndicesConfigurationPanelTemplate: StoryFn<IndicesConfigurationPanelStoryArgs> = ({
  isLoading,
  isReadOnly,
  logIndices,
  logViewStatus,
}) => {
  const logIndicesFormElement = useLogIndicesFormElement(logIndices);

  return (
    <>
      <IndicesConfigurationPanel
        isLoading={isLoading}
        isReadOnly={isReadOnly}
        indicesFormElement={logIndicesFormElement}
        logViewStatus={logViewStatus}
      />
      <EuiCodeBlock language="json">
        // field states{'\n'}
        {JSON.stringify(
          {
            logIndices: {
              value: logIndicesFormElement.value,
              validity: logIndicesFormElement.validity,
            },
          },
          null,
          2
        )}
      </EuiCodeBlock>
    </>
  );
};

const defaultArgs: IndicesConfigurationPanelStoryArgs = {
  isLoading: false,
  isReadOnly: false,
  logIndices: {
    type: 'index_name' as const,
    indexName: 'logs-*',
  },
  logViewStatus: {
    index: 'missing',
    reason: 'remoteClusterNotFound',
  },
  availableIndexPatterns: [
    {
      id: 'INDEX_PATTERN_A',
      title: 'pattern-a-*',
      timeFieldName: '@timestamp',
      type: undefined,
      fields: [
        {
          name: '@timestamp',
          type: KBN_FIELD_TYPES.DATE,
          searchable: true,
          aggregatable: true,
        },
        {
          name: 'message',
          type: KBN_FIELD_TYPES.STRING,
          searchable: true,
          aggregatable: true,
        },
      ],
    },
    {
      id: 'INDEX_PATTERN_B',
      title: 'pattern-b-*',
      timeFieldName: '@timestamp',
      type: undefined,
      fields: [],
    },
  ],
};

export const IndexNameWithDefaultFields: StoryObj<IndicesConfigurationPanelStoryArgs> = {
  render: IndicesConfigurationPanelTemplate,

  args: {
    ...defaultArgs,
  },
};

export const IndexPattern: StoryObj<IndicesConfigurationPanelStoryArgs> = {
  render: IndicesConfigurationPanelTemplate,

  args: {
    ...defaultArgs,
    logIndices: undefined,
  },
};
