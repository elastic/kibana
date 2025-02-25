/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentType, useEffect, useState } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { Meta, StoryObj } from '@storybook/react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { FieldValueSelectionProps } from '../types';
import { FieldValueSelection } from '../field_value_selection';

const values = [
  { label: 'elastic co frontend', count: 1 },
  { label: 'apm server', count: 2 },
];

const KibanaReactContext = createKibanaReactContext({
  uiSettings: { get: () => {}, get$: () => new Observable() },
} as unknown as Partial<CoreStart>);

const meta: Meta<FieldValueSelectionProps> = {
  title: 'app/Shared/FieldValueSuggestions',
  component: FieldValueSelection,
  decorators: [
    (Story: ComponentType<FieldValueSelectionProps>) => (
      <IntlProvider locale="en">
        <KibanaReactContext.Provider>
          <Story
            label="Service name"
            values={values}
            onChange={() => {}}
            selectedValue={[]}
            loading={false}
            setQuery={() => {}}
          />
        </KibanaReactContext.Provider>
      </IntlProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<FieldValueSelectionProps>;

export const ValuesLoaded: Story = {
  render: () => (
    <FieldValueSelection
      label="Service name"
      values={values}
      onChange={() => {}}
      selectedValue={[]}
      loading={false}
      setQuery={() => {}}
    />
  ),
};

export const LoadingState: Story = {
  render: () => (
    <FieldValueSelection
      label="Service name"
      values={values}
      onChange={() => {}}
      selectedValue={[]}
      loading={true}
      setQuery={() => {}}
    />
  ),
};

export const EmptyState: Story = {
  render: () => (
    <FieldValueSelection
      label="Service name"
      values={[]}
      onChange={() => {}}
      selectedValue={[]}
      loading={false}
      setQuery={() => {}}
    />
  ),
};

interface SearchStateProps extends FieldValueSelectionProps {
  query: string;
}

const SearchStateComponent = (args: SearchStateProps) => {
  const { query } = args;
  const [, setQuery] = useState('');

  useEffect(() => {
    setQuery(query);
  }, [query]);

  return (
    <FieldValueSelection
      label="Service name"
      values={values}
      onChange={() => {}}
      selectedValue={[]}
      loading={false}
      setQuery={setQuery}
    />
  );
};

export const SearchState: StoryObj<SearchStateProps> = {
  args: {
    query: '',
    label: 'Service name',
    values,
    loading: false,
  },
  argTypes: {
    query: {
      control: { type: 'text' },
      description: 'Search query',
    },
  },
  render: SearchStateComponent,
};
