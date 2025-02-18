/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useFetchSyntheticsSuggestions } from '../hooks/use_fetch_synthetics_suggestions';
import { StatusRuleParamsProps } from '../status_rule_ui';
import { LocationsField, MonitorField, MonitorTypeField, ProjectsField, TagsField } from './fields';

type FieldKeys = 'monitorIds' | 'projects' | 'tags' | 'locations' | 'monitorTypes';

interface Props {
  ruleParams: StatusRuleParamsProps['ruleParams'];
  setRuleParams: StatusRuleParamsProps['setRuleParams'];
}

export const FieldFilters = ({ ruleParams, setRuleParams }: Props) => {
  const [search, setSearch] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>();

  const {
    suggestions = [],
    isLoading,
    allSuggestions,
  } = useFetchSyntheticsSuggestions({
    search,
    fieldName: selectedField,
  });

  const onFieldChange = useCallback(
    (key: FieldKeys, value?: string[]) => {
      setRuleParams(key, value);
    },
    [setRuleParams]
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <MonitorField
            onChange={(val) => {
              onFieldChange('monitorIds', val);
            }}
            value={ruleParams.monitorIds}
            setSearch={setSearch}
            suggestions={suggestions}
            allSuggestions={allSuggestions}
            isLoading={isLoading}
            setSelectedField={setSelectedField}
            selectedField={selectedField}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MonitorTypeField
            onChange={(val) => {
              onFieldChange('monitorTypes', val);
            }}
            value={ruleParams.monitorTypes}
            setSearch={setSearch}
            suggestions={suggestions}
            allSuggestions={allSuggestions}
            isLoading={isLoading}
            setSelectedField={setSelectedField}
            selectedField={selectedField}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <TagsField
            onChange={(val) => {
              onFieldChange('tags', val);
            }}
            value={ruleParams.tags}
            setSearch={setSearch}
            suggestions={suggestions}
            allSuggestions={allSuggestions}
            isLoading={isLoading}
            setSelectedField={setSelectedField}
            selectedField={selectedField}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ProjectsField
            onChange={(val) => {
              onFieldChange('projects', val);
            }}
            value={ruleParams.projects}
            setSearch={setSearch}
            suggestions={suggestions}
            allSuggestions={allSuggestions}
            isLoading={isLoading}
            setSelectedField={setSelectedField}
            selectedField={selectedField}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <LocationsField
            onChange={(val) => {
              onFieldChange('locations', val);
            }}
            value={ruleParams.locations}
            setSearch={setSearch}
            suggestions={suggestions}
            allSuggestions={allSuggestions}
            isLoading={isLoading}
            setSelectedField={setSelectedField}
            selectedField={selectedField}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
