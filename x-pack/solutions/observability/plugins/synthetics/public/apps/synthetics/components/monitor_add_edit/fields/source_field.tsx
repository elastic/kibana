/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiTabbedContent, EuiFormRow } from '@elastic/eui';
import { CodeEditor } from './code_editor';
import { ScriptRecorderFields } from './script_recorder_fields';
import { ConfigKey, MonacoEditorLangId } from '../types';

enum SourceType {
  INLINE = 'syntheticsBrowserInlineConfig',
  SCRIPT_RECORDER = 'syntheticsBrowserScriptRecorderConfig',
  ZIP = 'syntheticsBrowserZipURLConfig',
}

interface SourceConfig {
  script: string;
  type: 'recorder' | 'inline';
  fileName?: string;
}

export interface SourceFieldProps {
  onChange: (sourceConfig: SourceConfig) => void;
  onBlur: (field: ConfigKey) => void;
  value: SourceConfig;
  isEditFlow?: boolean;
}

export const SourceField = ({ onChange, onBlur, value, isEditFlow = false }: SourceFieldProps) => {
  const [sourceType, setSourceType] = useState<SourceType>(
    value.type === 'inline' ? SourceType.INLINE : SourceType.SCRIPT_RECORDER
  );
  const [config, setConfig] = useState<SourceConfig>(value);

  useEffect(() => {
    onChange(config);
  }, [config, onChange]);

  const allTabs = [
    {
      id: 'syntheticsBrowserScriptRecorderConfig',
      name: isEditFlow ? (
        <FormattedMessage
          id="xpack.synthetics.monitorConfig.scriptRecorderEdit.label"
          defaultMessage="Upload new script"
        />
      ) : (
        <FormattedMessage
          id="xpack.synthetics.monitorConfig.scriptRecorder.label"
          defaultMessage="Upload script"
        />
      ),
      'data-test-subj': 'syntheticsSourceTab__scriptRecorder',
      content: (
        <ScriptRecorderFields
          onChange={({ scriptText, fileName }) => {
            setConfig((prevConfig) => ({
              ...prevConfig,
              script: scriptText,
              type: 'recorder',
              fileName,
            }));
          }}
          script={config.script}
          isEditable={isEditFlow}
          fileName={config.fileName}
        />
      ),
    },
    {
      id: 'syntheticsBrowserInlineConfig',
      name: (
        <FormattedMessage
          id="xpack.synthetics.addEditMonitor.scriptEditor.label"
          defaultMessage="Script editor"
        />
      ),
      'data-test-subj': `syntheticsSourceTab__inline`,
      content: (
        <EuiFormRow
          helpText={
            <FormattedMessage
              id="xpack.synthetics.addEditMonitor.scriptEditor.helpText"
              defaultMessage="Runs Synthetic test scripts that are defined inline."
            />
          }
          fullWidth
        >
          <CodeEditor
            ariaLabel={i18n.translate('xpack.synthetics.addEditMonitor.scriptEditor.ariaLabel', {
              defaultMessage: 'JavaScript code editor',
            })}
            id="javascript"
            languageId={MonacoEditorLangId.JAVASCRIPT}
            onChange={(code) => {
              setConfig((prevConfig) => ({ ...prevConfig, script: code }));
              onBlur(ConfigKey.SOURCE_INLINE);
            }}
            value={config.script}
            placeholder={i18n.translate(
              'xpack.synthetics.addEditMonitor.scriptEditor.placeholder',
              {
                defaultMessage: '// Paste your Playwright script here...',
              }
            )}
          />
        </EuiFormRow>
      ),
    },
  ];

  if (isEditFlow) {
    allTabs.reverse();
  }

  return (
    <EuiTabbedContent
      tabs={allTabs}
      initialSelectedTab={
        isEditFlow
          ? allTabs.find((tab) => tab.id === SourceType.INLINE)
          : allTabs.find((tab) => tab.id === sourceType)
      }
      autoFocus="selected"
      onTabClick={(tab) => {
        if (tab.id !== sourceType) {
          setConfig({
            script: '',
            type: tab.id === SourceType.INLINE ? 'inline' : 'recorder',
            fileName: '',
          });
        }
        setSourceType(tab.id as SourceType);
      }}
    />
  );
};
