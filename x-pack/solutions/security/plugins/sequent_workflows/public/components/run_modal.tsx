/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import { css } from '@emotion/react';

const LOCAL_STORAGE_KEY = 'sequentWorkflows.lastBaseUrl';
const DEFAULT_URL = 'http://localhost:8001';

const getSavedUrl = (): string => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
};

const saveUrl = (url: string): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, url);
  } catch {
    // noop
  }
};

const isValidUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

interface RunModalProps {
  onClose: () => void;
  onConfirm: (baseUrl: string) => void;
  isLoading: boolean;
  error?: string;
}

export const RunModal: React.FC<RunModalProps> = ({ onClose, onConfirm, isLoading, error }) => {
  const [baseUrl, setBaseUrl] = useState(getSavedUrl);
  const [touched, setTouched] = useState(false);

  const trimmed = baseUrl.trim();
  const isEmpty = trimmed.length === 0;
  const urlValid = isValidUrl(trimmed);
  const showError = touched && (!urlValid || isEmpty);

  const errorMessage = useMemo(() => {
    if (isEmpty) return 'A base URL is required';
    if (!urlValid) return 'Enter a valid HTTP or HTTPS URL (e.g. http://localhost:8001)';
    return undefined;
  }, [isEmpty, urlValid]);

  const handleRun = () => {
    setTouched(true);
    if (!urlValid) return;
    saveUrl(trimmed);
    onConfirm(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRun();
  };

  return (
    <EuiModal onClose={onClose} initialFocus="[name=baseUrl]" maxWidth={520}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="playFilled" color="primary" size="l" />
            </EuiFlexItem>
            <EuiFlexItem>Run Sequent Workflow</EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiPanel
          color="subdued"
          paddingSize="m"
          hasBorder={false}
          css={css`
            border-radius: 8px;
          `}
        >
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="iInCircle" color="primary" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                A Kibana workflow will be created with HTTP steps targeting the URL below. Your
                workflow-runner service must be running and reachable at this address.
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="l" />

        <EuiFormRow
          label="Workflow Runner Base URL"
          helpText="The workflow steps (healthcheck, execute, status) will call this URL"
          isInvalid={showError}
          error={showError ? errorMessage : undefined}
          fullWidth
        >
          <EuiFieldText
            name="baseUrl"
            placeholder="http://localhost:8001"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              if (!touched) setTouched(true);
            }}
            onKeyDown={handleKeyDown}
            isInvalid={showError}
            disabled={isLoading}
            prepend={<EuiIcon type="link" />}
            fullWidth
          />
        </EuiFormRow>

        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="xs" />
        <EuiSpacer size="s" />

        <EuiText size="xs" color="subdued">
          <EuiFlexGroup gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="editorOrderedList" size="s" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem>
              <strong>What happens when you click Run:</strong>
            </EuiFlexItem>
          </EuiFlexGroup>
          <ol
            css={css`
              margin: 4px 0 0 20px;
              padding: 0;
              li {
                margin-bottom: 2px;
              }
            `}
          >
            <li>Creates child workflows (horde, sep-rally) in Kibana</li>
            <li>Creates and starts the main workflow</li>
            <li>Workflow executes: healthcheck, sec-loadstar, then parallel fan-out</li>
            <li>Each step calls your runner service and reports status live</li>
          </ol>
        </EuiText>

        {error && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut title="Failed to start workflow" color="danger" iconType="error" size="s">
              <p>{error}</p>
            </EuiCallOut>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} disabled={isLoading}>
          Cancel
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleRun}
          isLoading={isLoading}
          disabled={showError && touched}
          iconType="playFilled"
          color="primary"
        >
          Run Workflow
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
