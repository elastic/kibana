/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { LIMITS, VALUE_TYPES, type ValueType } from '../../../common';
import { ApiErrorCallout, ValidationIssuesCallout } from '../api_error_callout';
import { isVersionConflict, toFeatureFlagsApiError, type FeatureFlagsApiError } from '../api_error';
import { useAppServices } from '../app_services';
import { ConfirmDeleteModal } from '../confirm_delete_modal';
import { cancelButtonLabel, deleteButtonLabel, saveButtonLabel } from '../labels';
import { CREATE_FLAG_ID, paths } from '../paths';
import { useAsyncData } from '../use_async_data';
import { useCatalog } from '../use_catalog';
import { EnvironmentRulesEditor } from './environment_rules_editor';
import {
  emptyFlagForm,
  flagToForm,
  prerequisiteCycleIssues,
  toCreateFlagRequest,
  toUpdateFlagRequest,
  validateFlagWrite,
  withEnvironmentKeys,
  withValueType,
  withVariations,
  type FlagFormState,
} from './flag_form';
import { rulesHaveValidPercentages } from './rule_composer/rules_model';
import { VariationFields } from './variation_fields';

const isValueType = (value: string): value is ValueType =>
  (VALUE_TYPES as readonly string[]).includes(value);

export const FlagEditorPage = () => {
  const history = useHistory();
  const { flagKey = '' } = useParams<{ flagKey: string }>();
  const isCreate = flagKey === CREATE_FLAG_ID;
  const { api, notifications, canSave } = useAppServices();
  const catalog = useCatalog();
  const loadFlag = useCallback(() => {
    if (isCreate) {
      return Promise.resolve(undefined);
    }
    return api.getFlag(flagKey);
  }, [api, flagKey, isCreate]);
  const flagQuery = useAsyncData(loadFlag);
  const [form, setForm] = useState<FlagFormState | undefined>(
    isCreate ? emptyFlagForm() : undefined
  );
  const [issues, setIssues] = useState<ReturnType<typeof validateFlagWrite>>([]);
  const [error, setError] = useState<FeatureFlagsApiError>();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [jsonBlockedByEnvironment, setJsonBlockedByEnvironment] = useState<Record<string, boolean>>(
    {}
  );
  const [suggestionApp, setSuggestionApp] = useState('');

  useEffect(() => {
    if (flagQuery.data) {
      setForm(flagToForm(flagQuery.data));
      setIssues([]);
      setError(undefined);
    }
  }, [flagQuery.data]);

  const onJsonBlockingChange = useCallback((environment: string, blocked: boolean) => {
    setJsonBlockedByEnvironment((current) => {
      if (current[environment] === blocked) {
        return current;
      }
      return { ...current, [environment]: blocked };
    });
  }, []);

  if (!isCreate && flagQuery.loading && !form) {
    return (
      <EuiPageTemplate.Section>
        <EuiLoadingSpinner size="l" />
      </EuiPageTemplate.Section>
    );
  }

  if (!isCreate && flagQuery.error && !form) {
    return (
      <EuiPageTemplate.Section>
        {flagQuery.error.statusCode === 404 ? (
          <EuiEmptyPrompt
            iconType="flag"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.featureFlagsManagement.flags.editor.notFoundTitle"
                  defaultMessage="Flag not found"
                />
              </h2>
            }
            actions={
              <EuiButtonEmpty
                data-ebt-action="cancel"
                data-ebt-element="featureFlagsManagement"
                data-test-subj="featureFlagsManagementFlagEditorPageBackToFlagsButton"
                iconType="chevronSingleLeft"
                onClick={() => history.push(paths.flags)}
              >
                <FormattedMessage
                  id="xpack.featureFlagsManagement.flags.editor.backToFlagsButtonLabel"
                  defaultMessage="Back to flags"
                />
              </EuiButtonEmpty>
            }
          />
        ) : (
          <ApiErrorCallout error={flagQuery.error} onReload={flagQuery.reload} />
        )}
      </EuiPageTemplate.Section>
    );
  }

  if (!form) {
    return null;
  }

  const readOnly = !canSave;
  const jsonBlocked = Object.values(jsonBlockedByEnvironment).some(Boolean);
  const percentagesValid = form.environmentKeys.every((environment) =>
    rulesHaveValidPercentages(form.environments[environment]?.rules ?? [])
  );
  const activeSuggestionApp = form.apps.includes(suggestionApp) ? suggestionApp : form.apps[0];
  const apps = catalog.data?.apps ?? [];
  const environments = catalog.data?.environments ?? [];

  const save = async () => {
    setError(undefined);
    if (jsonBlocked) {
      setIssues([
        {
          path: 'rules',
          message: i18n.translate(
            'xpack.featureFlagsManagement.flags.editor.applyJsonErrorMessage',
            {
              defaultMessage:
                'Apply the JSON rules, or switch back to the structured editor, before saving.',
            }
          ),
        },
      ]);
      return;
    }
    const nextIssues = validateFlagWrite(form, isCreate ? 'create' : 'update');
    if (nextIssues.length > 0) {
      setIssues(nextIssues);
      return;
    }
    setSaving(true);
    try {
      const hasPrerequisites = form.environmentKeys.some(
        (environment) => (form.environments[environment]?.prerequisites.length ?? 0) > 0
      );
      const flags = hasPrerequisites ? await api.listAllFlags() : [];
      const cycles = prerequisiteCycleIssues(form, flags);
      if (cycles.length > 0) {
        setIssues(cycles);
        return;
      }
      if (isCreate) {
        await api.createFlag(toCreateFlagRequest(form));
      } else {
        await api.updateFlag(form.key, toUpdateFlagRequest(form));
      }
      notifications.toasts.addSuccess(
        i18n.translate('xpack.featureFlagsManagement.flags.editor.saveSuccessToast', {
          defaultMessage: 'Saved {key}',
          values: { key: form.key.trim() },
        })
      );
      history.push(paths.flags);
    } catch (caught) {
      setError(toFeatureFlagsApiError(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await api.deleteFlag(form.key, form.version);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.featureFlagsManagement.flags.editor.deleteSuccessToast', {
          defaultMessage: 'Deleted {key}',
          values: { key: form.key },
        })
      );
      history.push(paths.flags);
    } catch (caught) {
      setError(toFeatureFlagsApiError(caught));
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EuiPageTemplate.Section>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-ebt-action="cancel"
            data-ebt-element="featureFlagsManagement"
            data-test-subj="featureFlagsManagementFlagEditorPageBackToFlagsButton"
            iconType="chevronSingleLeft"
            href={history.createHref({ pathname: paths.flags })}
          >
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.backToFlagsButtonLabel"
              defaultMessage="Back to flags"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        {!isCreate && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-ebt-action="viewFlagHistory"
              data-ebt-element="featureFlagsManagement"
              data-test-subj="featureFlagsManagementFlagEditorHistoryButton"
              iconType="clock"
              href={history.createHref({ pathname: paths.flagHistory(form.key) })}
            >
              <FormattedMessage
                id="xpack.featureFlagsManagement.flags.editor.historyButtonLabel"
                defaultMessage="History"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiTitle size="m">
        <h2>
          {isCreate ? (
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.createTitle"
              defaultMessage="Create flag"
            />
          ) : (
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.editTitle"
              defaultMessage="Edit {key}"
              values={{ key: form.key }}
            />
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      {error && (
        <>
          <ApiErrorCallout
            error={error}
            onReload={
              isVersionConflict(error)
                ? () => {
                    setError(undefined);
                    flagQuery.reload();
                  }
                : undefined
            }
          />
          <EuiSpacer size="m" />
        </>
      )}
      <ValidationIssuesCallout issues={issues} />
      {issues.length > 0 && <EuiSpacer size="m" />}
      <EuiForm
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.keyLabel"
              defaultMessage="Key"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.keyHelp"
              defaultMessage="Starts with a letter or digit. Letters, digits, dots, underscores and hyphens only. The key cannot change later."
            />
          }
        >
          <EuiFieldText
            data-test-subj="featureFlagsManagementFlagEditorPageFieldText"
            fullWidth
            disabled={readOnly || !isCreate}
            value={form.key}
            maxLength={LIMITS.flagKeyMaxLength}
            onChange={(event) => setForm({ ...form, key: event.target.value })}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.nameLabel"
              defaultMessage="Name"
            />
          }
        >
          <EuiFieldText
            data-test-subj="featureFlagsManagementFlagEditorPageFieldText"
            fullWidth
            disabled={readOnly}
            value={form.name}
            maxLength={LIMITS.nameMaxLength}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.descriptionLabel"
              defaultMessage="Description"
            />
          }
        >
          <EuiTextArea
            data-test-subj="featureFlagsManagementFlagEditorPageTextArea"
            fullWidth
            disabled={readOnly}
            value={form.description}
            maxLength={LIMITS.descriptionMaxLength}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.valueTypeLabel"
              defaultMessage="Value type"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.valueTypeHelp"
              defaultMessage="Changing the value type clears evaluation rules."
            />
          }
        >
          <EuiSelect
            data-ebt-action="changeSelection"
            data-ebt-element="featureFlagsManagement"
            data-test-subj="featureFlagsManagementFlagEditorPageSelect"
            fullWidth
            disabled={readOnly}
            value={form.valueType}
            options={VALUE_TYPES.map((valueType) => ({ value: valueType, text: valueType }))}
            onChange={(event) => {
              if (isValueType(event.target.value)) {
                setForm(withValueType(form, event.target.value));
              }
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.variationsTitle"
              defaultMessage="Variations"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <VariationFields
          valueType={form.valueType}
          variations={form.variations}
          readOnly={readOnly}
          onChange={(variations) => setForm(withVariations(form, variations))}
        />
        <EuiSpacer size="l" />
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.appsLabel"
              defaultMessage="Apps"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.appsHelp"
              defaultMessage="Apps that can evaluate this flag."
            />
          }
        >
          <EuiComboBox
            aria-label={i18n.translate('xpack.featureFlagsManagement.flags.editor.appsAriaLabel', {
              defaultMessage: 'Apps',
            })}
            fullWidth
            isDisabled={readOnly}
            options={apps.map((app) => ({ label: app.key, value: app.key }))}
            selectedOptions={form.apps.map((app) => ({ label: app, value: app }))}
            onChange={(selected) =>
              setForm({
                ...form,
                apps: selected.flatMap((option) =>
                  typeof option.value === 'string' ? [option.value] : []
                ),
              })
            }
          />
        </EuiFormRow>
        {form.apps.length > 1 && (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.featureFlagsManagement.flags.editor.suggestionAppLabel"
                defaultMessage="Suggest attributes from"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.featureFlagsManagement.flags.editor.suggestionAppHelp"
                defaultMessage="Observed context suggestions are scoped to one app and the rule's environment. You can still type any value."
              />
            }
          >
            <EuiSelect
              data-ebt-action="changeSelection"
              data-ebt-element="featureFlagsManagement"
              data-test-subj="featureFlagsManagementFlagEditorPageSelect"
              fullWidth
              value={activeSuggestionApp ?? ''}
              options={form.apps.map((app) => ({ value: app, text: app }))}
              onChange={(event) => setSuggestionApp(event.target.value)}
            />
          </EuiFormRow>
        )}
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.featureFlagsManagement.flags.editor.teamOwnerLabel"
                  defaultMessage="Team owner"
                />
              }
            >
              <EuiFieldText
                data-test-subj="featureFlagsManagementFlagEditorPageFieldText"
                fullWidth
                disabled={readOnly}
                value={form.teamOwner}
                maxLength={LIMITS.teamOwnerMaxLength}
                onChange={(event) => setForm({ ...form, teamOwner: event.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.featureFlagsManagement.flags.editor.deprecateByLabel"
                  defaultMessage="Deprecate by"
                />
              }
            >
              <EuiFieldText
                data-test-subj="featureFlagsManagementFlagEditorPageFieldText"
                fullWidth
                disabled={readOnly}
                value={form.deprecateBy}
                maxLength={LIMITS.deprecateByMaxLength}
                onChange={(event) => setForm({ ...form, deprecateBy: event.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.tagsLabel"
              defaultMessage="Tags"
            />
          }
        >
          <EuiComboBox
            aria-label={i18n.translate('xpack.featureFlagsManagement.flags.editor.tagsAriaLabel', {
              defaultMessage: 'Tags',
            })}
            fullWidth
            isDisabled={readOnly}
            selectedOptions={form.tags.map((tag) => ({ label: tag }))}
            onChange={(selected) =>
              setForm({ ...form, tags: selected.map((option) => option.label) })
            }
            onCreateOption={(created) => {
              const tag = created.trim();
              if (tag && !form.tags.includes(tag) && form.tags.length < LIMITS.maxTags) {
                setForm({ ...form, tags: [...form.tags, tag] });
              }
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.environmentsTitle"
              defaultMessage="Environments"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.environmentsLabel"
              defaultMessage="Configured environments"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.environmentsHelp"
              defaultMessage="The flag is served only in environments you configure here."
            />
          }
        >
          <EuiComboBox
            aria-label={i18n.translate(
              'xpack.featureFlagsManagement.flags.editor.environmentsAriaLabel',
              { defaultMessage: 'Environments' }
            )}
            fullWidth
            isDisabled={readOnly}
            options={environments.map((environment) => ({
              label: environment.key,
              value: environment.key,
            }))}
            selectedOptions={form.environmentKeys.map((environment) => ({
              label: environment,
              value: environment,
            }))}
            onChange={(selected) =>
              setForm(
                withEnvironmentKeys(
                  form,
                  selected.flatMap((option) =>
                    typeof option.value === 'string' ? [option.value] : []
                  )
                )
              )
            }
          />
        </EuiFormRow>
        {form.environmentKeys.map((environment, environmentIndex) => (
          <React.Fragment key={environment}>
            <EuiSpacer size="m" />
            <EnvironmentRulesEditor
              environment={environment}
              name={environments.find((item) => item.key === environment)?.name ?? environment}
              ruleSet={
                form.environments[environment] ?? {
                  defaultVariation: form.variations[0],
                  prerequisites: [],
                  rules: [],
                }
              }
              variations={form.variations}
              valueType={form.valueType}
              suggestionApp={activeSuggestionApp}
              currentFlagKey={isCreate ? form.key.trim() : form.key}
              readOnly={readOnly}
              initiallyOpen={environmentIndex === 0}
              onChange={(ruleSet) =>
                setForm({
                  ...form,
                  environments: { ...form.environments, [environment]: ruleSet },
                })
              }
              onJsonBlockingChange={(blocked) => onJsonBlockingChange(environment, blocked)}
            />
          </React.Fragment>
        ))}
        {!percentagesValid && (
          <>
            <EuiSpacer size="m" />
            <KbnWarningCallout
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.featureFlagsManagement.flags.editor.percentageSumTitle"
                  defaultMessage="Percentage weights must sum to 100"
                />
              }
              text={
                <FormattedMessage
                  id="xpack.featureFlagsManagement.flags.editor.percentageSumDescription"
                  defaultMessage="Each percentage rule needs weights that add up to 100 before the flag can be saved."
                />
              }
            />
          </>
        )}
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {!readOnly && !isCreate && (
              <EuiButtonEmpty
                data-ebt-action="deleteFlag"
                data-ebt-element="featureFlagsManagement"
                data-test-subj="featureFlagsManagementFlagEditorPageButton"
                color="danger"
                onClick={() => setConfirmDelete(true)}
              >
                {deleteButtonLabel()}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-ebt-action="saveFlag"
                  data-ebt-element="featureFlagsManagement"
                  data-test-subj="featureFlagsManagementFlagEditorPageButton"
                  onClick={() => history.push(paths.flags)}
                >
                  {cancelButtonLabel()}
                </EuiButtonEmpty>
              </EuiFlexItem>
              {!readOnly && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-ebt-action="saveFlag"
                    data-ebt-element="featureFlagsManagement"
                    type="submit"
                    fill
                    isLoading={saving}
                    disabled={!percentagesValid || jsonBlocked}
                    data-test-subj="featureFlagsSaveButton"
                  >
                    {saveButtonLabel()}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      {catalog.data?.appsTruncated || catalog.data?.environmentsTruncated ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.featureFlagsManagement.flags.editor.catalogTruncatedDescription"
                defaultMessage="Only the first {count} apps or environments are listed."
                values={{ count: LIMITS.maxEntitiesPerPage }}
              />
            </p>
          </EuiText>
        </>
      ) : null}
      {confirmDelete && (
        <ConfirmDeleteModal
          title={i18n.translate('xpack.featureFlagsManagement.flags.editor.deleteTitle', {
            defaultMessage: 'Delete {key}?',
            values: { key: form.key },
          })}
          confirming={saving}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            void remove();
          }}
        >
          <FormattedMessage
            id="xpack.featureFlagsManagement.flags.editor.deleteDescription"
            defaultMessage="Delete this flag. This fails while another flag uses it as a prerequisite."
          />
        </ConfirmDeleteModal>
      )}
    </EuiPageTemplate.Section>
  );
};
