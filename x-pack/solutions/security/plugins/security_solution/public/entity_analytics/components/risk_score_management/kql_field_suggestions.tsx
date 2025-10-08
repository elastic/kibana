/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFieldText, EuiListGroup, EuiListGroupItem, EuiText, EuiPanel } from '@elastic/eui';

// Common field suggestions for security alerts
const FIELD_SUGGESTIONS = [
  '_id',
  '_index',
  '@timestamp',
  'agent.build.original',
  'agent.ephemeral_id',
  'agent.id',
  'agent.name',
  'agent.type',
  'agent.version',
  'client.ip',
  'client.port',
  'destination.ip',
  'destination.port',
  'event.action',
  'event.category',
  'event.dataset',
  'event.id',
  'event.kind',
  'event.module',
  'event.original',
  'event.outcome',
  'event.provider',
  'event.severity',
  'event.type',
  'file.name',
  'file.path',
  'file.size',
  'host.architecture',
  'host.hostname',
  'host.id',
  'host.ip',
  'host.mac',
  'host.name',
  'host.os.family',
  'host.os.name',
  'host.os.platform',
  'host.os.version',
  'message',
  'process.args',
  'process.command_line',
  'process.name',
  'process.pid',
  'process.title',
  'rule.id',
  'rule.name',
  'rule.category',
  'rule.description',
  'rule.level',
  'rule.license',
  'rule.references',
  'rule.ruleset',
  'rule.version',
  'server.ip',
  'server.port',
  'service.name',
  'service.type',
  'source.ip',
  'source.port',
  'tags',
  'threat.framework',
  'threat.tactic.id',
  'threat.tactic.name',
  'threat.technique.id',
  'threat.technique.name',
  'url.domain',
  'url.full',
  'url.path',
  'url.port',
  'url.query',
  'url.scheme',
  'user.domain',
  'user.email',
  'user.full_name',
  'user.id',
  'user.name',
  'user.roles',
];

interface KqlFieldSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  compressed?: boolean;
  'data-test-subj'?: string;
}

export const KqlFieldSuggestions: React.FC<KqlFieldSuggestionsProps> = ({
  value,
  onChange,
  onKeyPress,
  placeholder,
  compressed = true,
  'data-test-subj': dataTestSubj,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;
      onChange(inputValue);

      // Show suggestions if there's text and it looks like a field name
      if (inputValue.trim() && !inputValue.includes(':')) {
        const filteredSuggestions = FIELD_SUGGESTIONS.filter((field) =>
          field.toLowerCase().includes(inputValue.toLowerCase())
        ).slice(0, 10); // Limit to 10 suggestions
        setSuggestions(filteredSuggestions);
      } else {
        setSuggestions([]);
      }
    },
    [onChange]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onChange(`${suggestion}: `);
      setSuggestions([]);
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    // Only show suggestions if there's text and no colon (field not completed)
    if (value.trim() && !value.includes(':')) {
      const filteredSuggestions = FIELD_SUGGESTIONS.filter((field) =>
        field.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    // Delay closing to allow for suggestion clicks
    setTimeout(() => setSuggestions([]), 150);
  }, []);

  return (
    <>
      <EuiFieldText
        placeholder={placeholder}
        compressed={compressed}
        data-test-subj={dataTestSubj}
        value={value}
        onChange={handleInputChange}
        onKeyPress={onKeyPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        fullWidth
      />
      {suggestions.length > 0 && (
        <EuiPanel hasBorder paddingSize="s" color="subdued">
          <EuiListGroup maxWidth={false} flush>
            {suggestions.map((suggestion, index) => (
              <EuiListGroupItem
                key={index}
                label={
                  <EuiText size="s">
                    <code>{suggestion}</code>
                  </EuiText>
                }
                onClick={() => handleSuggestionClick(suggestion)}
              />
            ))}
          </EuiListGroup>
        </EuiPanel>
      )}
    </>
  );
};
