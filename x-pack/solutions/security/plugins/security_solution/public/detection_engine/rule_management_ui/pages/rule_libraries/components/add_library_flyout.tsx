/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout, KbnSuccessCallout } from '@kbn/ui-callout';
import type {
  LibrarySource,
  NewRuleLibraryAuthType,
  NewRuleLibraryInput,
  RuleLibraryScope,
} from '../types';
import * as i18n from '../translations';

const MAX_TEXT_LENGTH = 256;
const MAX_SECRET_LENGTH = 4096;
const DEFAULT_SSH_USERNAME = 'git';
const FAKE_CONNECTION_TEST_DURATION_MS = 1000;

type ConnectionTestStatus = 'idle' | 'testing' | 'success' | 'failure';

const INITIAL_INPUT: NewRuleLibraryInput = {
  scope: 'shared',
  source: 'git_http',
  url: '',
  branch: 'main',
  region: '',
  authType: 'none',
  username: '',
  secret: '',
  knownHosts: '',
  pinnedVersion: '',
};

const CONNECTION_FIELDS: string[] = [
  'source',
  'url',
  'branch',
  'region',
  'authType',
  'username',
  'secret',
  'knownHosts',
];

interface SourceConfig {
  tabLabel: string;
  urlLabel: string;
  urlPlaceholder: string;
  urlPattern: RegExp;
  urlError: string;
  urlHelp?: string;
  authOptions: Array<{ value: NewRuleLibraryAuthType; text: string }>;
}

const SOURCES: Record<LibrarySource, SourceConfig> = {
  git_http: {
    tabLabel: i18n.TAB_GIT_HTTP,
    urlLabel: i18n.FORM_GIT_HTTP_URL_LABEL,
    urlPlaceholder: i18n.FORM_GIT_HTTP_URL_PLACEHOLDER,
    urlPattern: /^https:\/\/\S+$/,
    urlError: i18n.FORM_GIT_HTTP_URL_ERROR,
    authOptions: [
      { value: 'none', text: i18n.AUTH_NONE },
      { value: 'token', text: i18n.AUTH_TOKEN },
    ],
  },
  git_ssh: {
    tabLabel: i18n.TAB_GIT_SSH,
    urlLabel: i18n.FORM_GIT_SSH_URL_LABEL,
    urlPlaceholder: i18n.FORM_GIT_SSH_URL_PLACEHOLDER,
    urlPattern: /^ssh:\/\/\S+$|^[\w.-]+@[\w.-]+:\S+$/,
    urlError: i18n.FORM_GIT_SSH_URL_ERROR,
    urlHelp: i18n.FORM_GIT_SSH_URL_HELP,
    authOptions: [],
  },
  s3: {
    tabLabel: i18n.TAB_S3,
    urlLabel: i18n.FORM_S3_URL_LABEL,
    urlPlaceholder: i18n.FORM_S3_URL_PLACEHOLDER,
    urlPattern: /^https?:\/\/\S+$/,
    urlError: i18n.FORM_URL_ERROR,
    authOptions: [
      { value: 'none', text: i18n.AUTH_NONE },
      { value: 's3_access_key', text: i18n.AUTH_S3_ACCESS_KEY },
    ],
  },
};

const SOURCE_ORDER: LibrarySource[] = ['git_http', 'git_ssh', 's3'];

const SCOPE_OPTIONS = [
  { id: 'shared', label: i18n.FORM_SCOPE_SHARED_OPTION },
  { id: 'space', label: i18n.FORM_SCOPE_SPACE_OPTION },
];

interface FormErrors {
  url: string | undefined;
  username: string | undefined;
  secret: string | undefined;
  knownHosts: string | undefined;
}

const getFieldError = (showErrors: boolean, error: string | undefined) => ({
  isInvalid: showErrors && Boolean(error),
  error: showErrors ? error : undefined,
});

const getAuthRequirements = (authType: NewRuleLibraryAuthType) => ({
  needsUsername: authType === 'ssh_key' || authType === 's3_access_key',
  needsSecret: authType !== 'none',
});

const getSecretLabel = (authType: NewRuleLibraryAuthType): string => {
  if (authType === 'ssh_key') return i18n.FORM_PRIVATE_KEY_LABEL;
  if (authType === 'token') return i18n.FORM_TOKEN_LABEL;
  return i18n.FORM_SECRET_ACCESS_KEY_LABEL;
};

interface AuthFieldsProps {
  input: NewRuleLibraryInput;
  errors: FormErrors;
  showErrors: boolean;
  onChange: (changes: Partial<NewRuleLibraryInput>) => void;
}

const AuthFields = ({ input, errors, showErrors, onChange }: AuthFieldsProps) => {
  const isSshKey = input.authType === 'ssh_key';
  const { needsUsername, needsSecret } = getAuthRequirements(input.authType);
  const usernameError = getFieldError(showErrors, errors.username);
  const secretError = getFieldError(showErrors, errors.secret);
  const knownHostsError = getFieldError(showErrors, errors.knownHosts);

  return (
    <>
      {needsUsername ? (
        <EuiFormRow
          label={isSshKey ? i18n.FORM_USERNAME_LABEL : i18n.FORM_ACCESS_KEY_ID_LABEL}
          fullWidth
          {...usernameError}
        >
          <EuiFieldText
            fullWidth
            maxLength={MAX_TEXT_LENGTH}
            placeholder={
              isSshKey ? i18n.FORM_USERNAME_PLACEHOLDER : i18n.FORM_ACCESS_KEY_ID_PLACEHOLDER
            }
            value={input.username}
            isInvalid={usernameError.isInvalid}
            onChange={({ target }) => onChange({ username: target.value })}
          />
        </EuiFormRow>
      ) : null}
      {needsSecret ? (
        <EuiFormRow
          label={getSecretLabel(input.authType)}
          helpText={isSshKey ? i18n.FORM_PRIVATE_KEY_HELP : i18n.FORM_SECRET_HELP}
          fullWidth
          {...secretError}
        >
          {isSshKey ? (
            <EuiTextArea
              fullWidth
              rows={6}
              maxLength={MAX_SECRET_LENGTH}
              placeholder={i18n.FORM_PRIVATE_KEY_PLACEHOLDER}
              value={input.secret}
              isInvalid={secretError.isInvalid}
              onChange={({ target }) => onChange({ secret: target.value })}
              data-test-subj="addRuleLibrarySecret"
            />
          ) : (
            <EuiFieldPassword
              fullWidth
              type="dual"
              maxLength={MAX_SECRET_LENGTH}
              value={input.secret}
              isInvalid={secretError.isInvalid}
              onChange={({ target }) => onChange({ secret: target.value })}
              data-test-subj="addRuleLibrarySecret"
            />
          )}
        </EuiFormRow>
      ) : null}
      {isSshKey ? (
        <EuiFormRow
          label={i18n.FORM_KNOWN_HOSTS_LABEL}
          helpText={i18n.FORM_KNOWN_HOSTS_HELP}
          fullWidth
          {...knownHostsError}
        >
          <EuiTextArea
            fullWidth
            rows={3}
            maxLength={MAX_SECRET_LENGTH}
            placeholder={i18n.FORM_KNOWN_HOSTS_PLACEHOLDER}
            isInvalid={knownHostsError.isInvalid}
            value={input.knownHosts}
            onChange={({ target }) => onChange({ knownHosts: target.value })}
          />
        </EuiFormRow>
      ) : null}
    </>
  );
};

const ConnectionTestResult = ({ status }: { status: ConnectionTestStatus }) => {
  if (status === 'success') {
    return (
      <>
        <EuiSpacer size="s" />
        <KbnSuccessCallout
          announceOnMount
          size="s"
          title={i18n.TEST_CONNECTION_SUCCESS_TITLE}
          text={<p>{i18n.TEST_CONNECTION_SUCCESS_BODY}</p>}
        />
      </>
    );
  }
  if (status === 'failure') {
    return (
      <>
        <EuiSpacer size="s" />
        <KbnDangerCallout
          announceOnMount
          size="s"
          title={i18n.TEST_CONNECTION_FAILURE_TITLE}
          text={<p>{i18n.TEST_CONNECTION_FAILURE_BODY}</p>}
        />
      </>
    );
  }
  return null;
};

interface AddLibraryFlyoutProps {
  onAdd: (input: NewRuleLibraryInput) => void;
  onClose: () => void;
}

export const AddLibraryFlyout = ({ onAdd, onClose }: AddLibraryFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'addRuleLibraryFlyoutTitle' });
  const [input, setInput] = useState<NewRuleLibraryInput>(INITIAL_INPUT);
  const [showErrors, setShowErrors] = useState(false);
  const [connectionTest, setConnectionTest] = useState<ConnectionTestStatus>('idle');

  const update = (changes: Partial<NewRuleLibraryInput>) => {
    setInput((current) => ({ ...current, ...changes }));
    if (Object.keys(changes).some((key) => CONNECTION_FIELDS.includes(key))) {
      setConnectionTest('idle');
    }
  };

  const selectSource = (source: LibrarySource) => {
    update({
      source,
      url: '',
      authType: source === 'git_ssh' ? 'ssh_key' : 'none',
      username: source === 'git_ssh' ? DEFAULT_SSH_USERNAME : '',
      secret: '',
      knownHosts: '',
    });
    setShowErrors(false);
  };

  const sourceConfig = SOURCES[input.source];
  const { needsUsername, needsSecret } = getAuthRequirements(input.authType);

  const errors = {
    url: sourceConfig.urlPattern.test(input.url.trim()) ? undefined : sourceConfig.urlError,
    username: needsUsername && !input.username.trim() ? i18n.FORM_REQUIRED_ERROR : undefined,
    secret: needsSecret && !input.secret ? i18n.FORM_REQUIRED_ERROR : undefined,
    knownHosts:
      input.authType === 'ssh_key' && !input.knownHosts.trim()
        ? i18n.FORM_REQUIRED_ERROR
        : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const hasConnectionErrors = hasErrors;

  const testConnection = () => {
    setConnectionTest('testing');
    setTimeout(() => {
      setConnectionTest(input.url.includes('fail') ? 'failure' : 'success');
    }, FAKE_CONNECTION_TEST_DURATION_MS);
  };

  const submit = () => {
    setShowErrors(true);
    if (!hasErrors) {
      onAdd({ ...input, url: input.url.trim() });
    }
  };

  const fieldError = (error: string | undefined) => getFieldError(showErrors, error);

  return (
    <EuiFlyout size="m" onClose={onClose} aria-labelledby={flyoutTitleId} ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{i18n.ADD_LIBRARY}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" data-test-subj="addRuleLibraryForm">
          <EuiFormRow label={i18n.FORM_SCOPE_LABEL} fullWidth>
            <EuiRadioGroup
              name="addRuleLibraryScope"
              options={SCOPE_OPTIONS}
              idSelected={input.scope}
              onChange={(scope) => update({ scope: scope as RuleLibraryScope })}
            />
          </EuiFormRow>

          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3>{i18n.FORM_SECTION_SOURCE}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFormRow label={i18n.FORM_PROVIDER_LABEL} fullWidth>
            <EuiButtonGroup
              isFullWidth
              legend={i18n.FORM_PROVIDER_LEGEND}
              options={SOURCE_ORDER.map((source) => ({
                id: source,
                label: SOURCES[source].tabLabel,
              }))}
              idSelected={input.source}
              onChange={(source) => selectSource(source as LibrarySource)}
              data-test-subj="addRuleLibrarySource"
            />
          </EuiFormRow>
          <EuiFormRow
            label={sourceConfig.urlLabel}
            helpText={sourceConfig.urlHelp}
            fullWidth
            {...fieldError(errors.url)}
          >
            <EuiFieldText
              fullWidth
              maxLength={MAX_TEXT_LENGTH}
              placeholder={sourceConfig.urlPlaceholder}
              value={input.url}
              isInvalid={showErrors && Boolean(errors.url)}
              onChange={({ target }) => update({ url: target.value })}
              data-test-subj="addRuleLibraryUrl"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiFormRow label={i18n.FORM_BRANCH_LABEL} fullWidth>
                <EuiFieldText
                  fullWidth
                  maxLength={MAX_TEXT_LENGTH}
                  placeholder={i18n.FORM_BRANCH_PLACEHOLDER}
                  value={input.branch}
                  onChange={({ target }) => update({ branch: target.value })}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {input.source === 's3' ? (
              <EuiFlexItem>
                <EuiFormRow label={i18n.FORM_REGION_LABEL} fullWidth>
                  <EuiFieldText
                    fullWidth
                    maxLength={MAX_TEXT_LENGTH}
                    placeholder={i18n.FORM_REGION_PLACEHOLDER}
                    value={input.region}
                    onChange={({ target }) => update({ region: target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.FORM_PINNED_VERSION_LABEL}
            helpText={i18n.FORM_PINNED_VERSION_HELP}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              maxLength={MAX_TEXT_LENGTH}
              placeholder={i18n.FORM_PINNED_VERSION_PLACEHOLDER}
              value={input.pinnedVersion}
              onChange={({ target }) => update({ pinnedVersion: target.value })}
            />
          </EuiFormRow>
          {sourceConfig.authOptions.length > 0 ? (
            <EuiFormRow label={i18n.FORM_AUTH_LABEL} fullWidth>
              <EuiSelect
                fullWidth
                options={sourceConfig.authOptions}
                value={input.authType}
                onChange={({ target }) =>
                  update({
                    authType: target.value as NewRuleLibraryAuthType,
                    username: '',
                    secret: '',
                  })
                }
                data-test-subj="addRuleLibraryAuthType"
              />
            </EuiFormRow>
          ) : null}
          <AuthFields input={input} errors={errors} showErrors={showErrors} onChange={update} />
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            iconType="wifi"
            isLoading={connectionTest === 'testing'}
            isDisabled={hasConnectionErrors}
            onClick={testConnection}
            data-test-subj="addRuleLibraryTestConnection"
          >
            {i18n.TEST_CONNECTION}
          </EuiButton>
          <ConnectionTestResult status={connectionTest} />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              {i18n.FLYOUT_CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={submit} data-test-subj="addRuleLibrarySubmit">
              {i18n.ADD_LIBRARY}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
