/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeDuration } from '@kbn/securitysolution-utils/time_duration';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { toSimpleRuleSchedule } from '../../../../../../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import {
  addEuiComboBoxOption,
  clearEuiComboBoxSelection,
  selectEuiComboBoxOption,
} from '../../../../../../../common/test/eui/combobox';
import { selectEuiSuperSelectOption } from '../../../../../../../common/test/eui/super_select';
import type {
  AlertSuppression,
  AnomalyThreshold,
  HistoryWindowStart,
  InlineKqlQuery,
  MachineLearningJobId,
  NewTermsFields,
  RuleEqlQuery,
  RuleKqlQuery,
  ThreatIndex,
  Threshold,
} from '../../../../../../../../common/api/detection_engine';
import {
  DataSourceType,
  type BuildingBlockObject,
  type DiffableAllFields,
  type InvestigationFields,
  type RelatedIntegration,
  type RequiredField,
  type RiskScoreMapping,
  type RuleDataSource,
  type RuleNameOverrideObject,
  type SeverityMapping,
  type Threat,
  type TimelineTemplateReference,
  type TimestampOverrideObject,
  KqlQueryType,
} from '../../../../../../../../common/api/detection_engine';
import type { RuleSchedule } from '../../../../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';

type ToDiscriminatedUnion<T> = {
  [K in keyof T]-?: { fieldName: K; value: T[K] };
}[keyof T];

export async function inputFieldValue(
  wrapper: HTMLElement,
  params: ToDiscriminatedUnion<DiffableAllFields>
): Promise<void> {
  const fieldFinalSide = within(wrapper).getByTestId(`${params.fieldName}-finalSide`);

  switch (params.fieldName) {
    case 'name':
      await inputText(fieldFinalSide, params.value);
      break;

    case 'description':
      await inputText(fieldFinalSide, params.value);
      break;

    case 'severity':
      await inputSeverity(fieldFinalSide, params.value);
      break;

    case 'severity_mapping':
      await inputSeverityMapping(fieldFinalSide, params.value);
      break;

    case 'risk_score':
      await inputRiskScore(fieldFinalSide, params.value);
      break;

    case 'risk_score_mapping':
      await inputRiskScoreOverride(fieldFinalSide, params.value);
      break;

    case 'references':
      await inputStringsArray(fieldFinalSide, {
        addInputButtonName: 'Add reference URL',
        items: params.value,
      });
      break;

    case 'false_positives':
      await inputStringsArray(fieldFinalSide, {
        addInputButtonName: 'Add false positive example',
        items: params.value,
      });
      break;

    case 'threat':
      await inputThreat(fieldFinalSide, params.value);
      break;

    case 'note':
      await inputText(fieldFinalSide, params.value);
      break;

    case 'setup':
      await inputText(fieldFinalSide, params.value);
      break;

    case 'related_integrations':
      await inputRelatedIntegrations(fieldFinalSide, params.value);
      break;

    case 'required_fields':
      await inputRequiredFields(fieldFinalSide, params.value);
      break;

    case 'rule_schedule':
      await inputRuleSchedule(fieldFinalSide, params.value);
      break;

    case 'max_signals':
      await inputMaxSignals(fieldFinalSide, params.value);
      break;

    case 'rule_name_override':
      await inputRuleNameOverride(fieldFinalSide, params.value);
      break;

    case 'timestamp_override':
      await inputTimestampOverride(fieldFinalSide, params.value);
      break;

    case 'timeline_template':
      await inputTimelineTemplate(fieldFinalSide, params.value);
      break;

    case 'building_block':
      await inputBuildingBlock(fieldFinalSide, params.value);
      break;

    case 'investigation_fields':
      await inputInvestigationFields(fieldFinalSide, params.value);
      break;

    case 'data_source':
      await inputDataSource(fieldFinalSide, params.value);
      break;

    case 'alert_suppression':
      await inputAlertSuppression(fieldFinalSide, params.value);
      break;

    case 'anomaly_threshold':
      await inputAnomalyThreshold(fieldFinalSide, params.value);
      break;

    case 'kql_query':
      await inputKqlQuery(fieldFinalSide, params.value);
      break;

    case 'eql_query':
      await inputEqlQuery(fieldFinalSide, params.value);
      break;

    case 'esql_query':
      throw new Error('Not implemented');

    case 'history_window_start':
      await inputHistoryWindowStart(fieldFinalSide, params.value);
      break;

    case 'machine_learning_job_id':
      await inputMachineLearningJobId(fieldFinalSide, params.value);
      break;

    case 'new_terms_fields':
      await inputNewTermsFields(fieldFinalSide, params.value);
      break;

    case 'threat_index':
      await inputThreatIndex(fieldFinalSide, params.value);
      break;

    case 'threat_indicator_path':
      await inputText(fieldFinalSide, params.value ?? '');
      break;

    case 'threat_mapping':
      throw new Error('Not implemented');

    case 'threat_query':
      await inputThreatQuery(fieldFinalSide, params.value);
      break;

    case 'threshold':
      await inputThreshold(fieldFinalSide, params.value);
      break;
  }
}

async function fireEnterEvent(el: HTMLElement): Promise<void> {
  await act(async () => {
    el.focus();
    await userEvent.keyboard('{Enter}');
  });
}

async function inputText(fieldFinalSide: HTMLElement, value: string): Promise<void> {
  await act(async () => {
    const input = within(fieldFinalSide).getByRole('textbox');

    fireEvent.change(input, {
      target: { value },
    });
  });
}

async function inputSeverity(fieldFinalSide: HTMLElement, value: string): Promise<void> {
  const toggleButton = within(fieldFinalSide).getByTestId('select');

  await selectEuiSuperSelectOption({
    toggleButton,
    optionText: value,
  });
}

async function inputSeverityMapping(
  fieldFinalSide: HTMLElement,
  value: SeverityMapping
): Promise<void> {
  const severityArray = ['low', 'medium', 'high', 'critical'];
  const severityMappingFormRows = within(fieldFinalSide).getAllByTestId('severityOverrideRow');

  expect(severityMappingFormRows).toHaveLength(severityArray.length);

  for (let i = 0; i < severityArray.length; ++i) {
    const severityLevel = severityArray[i];
    const formRow = severityMappingFormRows[i];
    const [sourceFieldComboboxInput, sourceValueComboboxInput] =
      within(formRow).getAllByRole('combobox');
    const mapping = value.find((x) => x.severity.toLowerCase() === severityLevel);

    if (mapping) {
      await act(async () => {
        fireEvent.change(sourceFieldComboboxInput, {
          target: { value: mapping.field },
        });
      });
      await fireEnterEvent(sourceFieldComboboxInput);

      await act(async () => {
        fireEvent.change(sourceValueComboboxInput, {
          target: { value: mapping.value },
        });
      });
      await fireEnterEvent(sourceValueComboboxInput);
    } else {
      // Clear mapping value for the current severity level
      await act(async () => {
        sourceFieldComboboxInput.focus();
        await userEvent.keyboard('{Backspace}');
      });
    }
  }
}

async function inputRiskScore(fieldFinalSide: HTMLElement, value: number): Promise<void> {
  await act(async () => {
    // EuiRange is used for Risk Score
    const [riskScoreInput] = within(fieldFinalSide).getAllByTestId(
      'defaultRiskScore-defaultRiskRange'
    );

    fireEvent.change(riskScoreInput, {
      target: { value },
    });
  });
}

async function inputRiskScoreOverride(
  fieldFinalSide: HTMLElement,
  value: RiskScoreMapping
): Promise<void> {
  invariant(value.length === 1, 'setRiskScoreOverride() expects a single entry risk score mapping');

  const sourceFieldComboboxInput = within(fieldFinalSide).getByRole('combobox');

  await waitFor(() => expect(sourceFieldComboboxInput).toBeEnabled(), { timeout: 500 });
  await act(async () => {
    fireEvent.change(sourceFieldComboboxInput, {
      target: { value: value[0].field },
    });
  });

  await fireEnterEvent(sourceFieldComboboxInput);
}

async function inputStringsArray(
  fieldFinalSide: HTMLElement,
  {
    addInputButtonName,
    items,
  }: {
    addInputButtonName: string;
    items: string[];
  }
): Promise<void> {
  await removeExistingItems(fieldFinalSide);

  const addItem = async () => {
    await act(async () => {
      fireEvent.click(
        within(fieldFinalSide).getByRole('button', {
          name: addInputButtonName,
        })
      );
    });
  };

  for (let i = 0; i < items.length; ++i) {
    await addItem();

    const inputs = within(fieldFinalSide).getAllByRole('textbox');

    await act(async () => {
      fireEvent.change(inputs[i], {
        target: { value: items[i] },
      });
    });
  }
}

// Limited to tactics
async function inputThreat(fieldFinalSide: HTMLElement, value: Threat[]): Promise<void> {
  await removeExistingItems(fieldFinalSide);

  const addTactic = async () => {
    await act(async () => {
      fireEvent.click(
        within(fieldFinalSide).getByRole('button', {
          name: 'Add tactic',
        })
      );
    });
  };

  for (let i = 0; i < value.length; ++i) {
    await addTactic();

    await selectEuiSuperSelectOption({
      toggleButton: within(fieldFinalSide).getAllByTestId('mitreAttackTactic')[i],
      optionText: `${value[i].tactic.name} (${value[i].tactic.id})`,
    });
  }
}

/**
 * Requires mocking response with integrations from `GET /internal/detection_engine/fleet/integrations/all`
 */
async function inputRelatedIntegrations(
  fieldFinalSide: HTMLElement,
  value: RelatedIntegration[]
): Promise<void> {
  await removeExistingItems(fieldFinalSide, { removeButtonName: 'Remove related integration' });

  const addIntegration = async () => {
    await act(async () => {
      fireEvent.click(
        within(fieldFinalSide).getByRole('button', {
          name: 'Add integration',
        })
      );
    });
  };

  for (let i = 0; i < value.length; ++i) {
    const { package: integrationPackageName, version } = value[i];

    await addIntegration();

    await selectEuiComboBoxOption({
      comboBoxToggleButton: within(fieldFinalSide).getAllByTestId('comboBoxToggleListButton')[i],
      // Expect only installed and enabled integrations
      optionText: `${integrationPackageName}Installed: Enabled`,
    });

    const packageVersionInput = within(fieldFinalSide).getAllByRole('textbox')[i];

    await waitFor(() => expect(packageVersionInput).toBeEnabled(), { timeout: 500 });

    await act(async () => {
      fireEvent.change(packageVersionInput, {
        target: { value: version },
      });
    });
  }
}

async function inputRequiredFields(
  fieldFinalSide: HTMLElement,
  value: RequiredField[]
): Promise<void> {
  await removeExistingItems(fieldFinalSide, { removeButtonName: 'Remove required field' });

  const addRequiredField = async () => {
    await act(async () => {
      fireEvent.click(
        within(fieldFinalSide).getByRole('button', {
          name: 'Add required field',
        })
      );
    });
  };

  for (let i = 0; i < value.length; ++i) {
    const { name, type } = value[i];

    await addRequiredField();

    const formRow = within(fieldFinalSide).getAllByTestId('requiredFieldsFormRow')[i];
    const [nameInput, typeInput] = within(formRow).getAllByRole('combobox');

    await act(async () => {
      fireEvent.change(nameInput, {
        target: { value: name },
      });
    });
    await fireEnterEvent(nameInput);

    await act(async () => {
      fireEvent.change(typeInput, {
        target: { value: type },
      });
    });
    await fireEnterEvent(typeInput);
  }
}

async function inputRuleSchedule(
  fieldFinalSide: HTMLElement,
  ruleSchedule: RuleSchedule
): Promise<void> {
  const intervalFormRow = within(fieldFinalSide).getByTestId('intervalFormRow');
  const intervalValueInput = within(intervalFormRow).getByRole('spinbutton');
  const intervalUnitInput = within(intervalFormRow).getByRole('combobox');
  const lookBackFormRow = within(fieldFinalSide).getByTestId('lookbackFormRow');
  const lookBackValueInput = within(lookBackFormRow).getByRole('spinbutton');
  const lookBackUnitInput = within(lookBackFormRow).getByRole('combobox');

  const simpleRuleSchedule = toSimpleRuleSchedule(ruleSchedule);

  invariant(
    simpleRuleSchedule,
    'Provided rule schedule is not convertible to simple rule schedule'
  );

  const parsedInterval = TimeDuration.parse(simpleRuleSchedule.interval);
  const parsedLookBack = TimeDuration.parse(simpleRuleSchedule.lookback);

  await act(async () => {
    fireEvent.change(intervalValueInput, {
      target: { value: parsedInterval?.value },
    });
  });

  await act(async () => {
    fireEvent.change(intervalUnitInput, {
      target: { value: parsedInterval?.unit },
    });
  });

  await act(async () => {
    fireEvent.change(lookBackValueInput, {
      target: { value: parsedLookBack?.value },
    });
  });

  await act(async () => {
    fireEvent.change(lookBackUnitInput, {
      target: { value: parsedLookBack?.unit },
    });
  });
}

async function inputMaxSignals(fieldFinalSide: HTMLElement, value: number): Promise<void> {
  const input = within(fieldFinalSide).getByRole('spinbutton');

  await act(async () => {
    fireEvent.change(input, {
      target: { value },
    });
  });
}

async function inputRuleNameOverride(
  fieldFinalSide: HTMLElement,
  value: RuleNameOverrideObject | undefined
): Promise<void> {
  await waitFor(
    () => expect(within(fieldFinalSide).getByTestId('comboBoxSearchInput')).toBeEnabled(),
    { timeout: 500 }
  );

  if (value) {
    await selectEuiComboBoxOption({
      comboBoxToggleButton: within(fieldFinalSide).getByTestId('comboBoxToggleListButton'),
      optionText: value.field_name,
    });
  } else {
    await act(async () => {
      within(fieldFinalSide).getByTestId('comboBoxSearchInput').focus();
      await userEvent.keyboard('{Backspace}');
    });
  }
}

async function inputTimestampOverride(
  fieldFinalSide: HTMLElement,
  value: TimestampOverrideObject | undefined
): Promise<void> {
  await waitFor(
    () => expect(within(fieldFinalSide).getByTestId('comboBoxSearchInput')).toBeEnabled(),
    { timeout: 500 }
  );

  if (value) {
    await selectEuiComboBoxOption({
      comboBoxToggleButton: within(fieldFinalSide).getByTestId('comboBoxToggleListButton'),
      optionText: value.field_name,
    });
  } else {
    await act(async () => {
      within(fieldFinalSide).getByTestId('comboBoxSearchInput').focus();
      await userEvent.keyboard('{Backspace}');
    });
  }
}

async function inputTimelineTemplate(
  fieldFinalSide: HTMLElement,
  value: TimelineTemplateReference | undefined
): Promise<void> {
  const timelineSelectToggleButton = within(fieldFinalSide).getByRole('combobox');

  await act(async () => {
    fireEvent.click(timelineSelectToggleButton);
  });

  const options = Array.from(document.querySelectorAll('[role="option"]'));

  const lowerCaseOptionText = value?.timeline_title.toLocaleLowerCase() ?? 'None';
  const optionToSelect = options.find((option) =>
    option.textContent?.toLowerCase().includes(lowerCaseOptionText)
  );

  if (optionToSelect) {
    await act(async () => {
      fireEvent.click(optionToSelect);
    });
  } else {
    throw new Error(
      `Could not find option with text "${lowerCaseOptionText}". Available options: ${options
        .map((option) => option.textContent)
        .join(', ')}`
    );
  }
}

async function inputBuildingBlock(
  fieldFinalSide: HTMLElement,
  value: BuildingBlockObject | undefined
): Promise<void> {
  const markGeneratedAlertsAsBuildingBlockAlertsCheckbox = within(fieldFinalSide).getByRole(
    'checkbox'
  ) as HTMLInputElement;

  // Field is already in the expected state, exit.
  if (
    (markGeneratedAlertsAsBuildingBlockAlertsCheckbox.checked && value) ||
    (!markGeneratedAlertsAsBuildingBlockAlertsCheckbox.checked && !value)
  ) {
    return;
  }

  await act(async () => {
    fireEvent.click(markGeneratedAlertsAsBuildingBlockAlertsCheckbox);
  });
}

async function inputInvestigationFields(
  fieldFinalSide: HTMLElement,
  value: InvestigationFields | undefined
): Promise<void> {
  await waitFor(() =>
    expect(within(fieldFinalSide).queryByTestId('comboBoxClearButton')).toBeVisible()
  );

  await clearEuiComboBoxSelection({
    clearButton: within(fieldFinalSide).getByTestId('comboBoxClearButton'),
  });

  for (const fieldName of value?.field_names ?? []) {
    await selectEuiComboBoxOption({
      comboBoxToggleButton: within(fieldFinalSide).getByTestId('comboBoxToggleListButton'),
      optionText: fieldName,
    });
  }
}

async function inputDataSource(
  fieldFinalSide: HTMLElement,
  dataSource: RuleDataSource | undefined
): Promise<void> {
  if (!dataSource) {
    return;
  }

  const indexPatternsEditWrapper = within(fieldFinalSide).getByTestId('indexPatternEdit');
  const dataViewEditWrapper = within(fieldFinalSide).getByTestId('pick-rule-data-source');

  switch (dataSource.type) {
    case DataSourceType.index_patterns:
      await clearEuiComboBoxSelection({
        clearButton: within(indexPatternsEditWrapper).getByTestId('comboBoxClearButton'),
      });

      for (const indexPattern of dataSource.index_patterns) {
        await addEuiComboBoxOption({
          wrapper: indexPatternsEditWrapper,
          optionText: indexPattern,
        });
      }

      break;

    case DataSourceType.data_view:
      await waitFor(
        () =>
          expect(
            within(dataViewEditWrapper).queryByTestId('comboBoxToggleListButton')
          ).toBeVisible(),
        {
          timeout: 500,
        }
      );

      await selectEuiComboBoxOption({
        comboBoxToggleButton: within(dataViewEditWrapper).getByTestId('comboBoxToggleListButton'),
        optionText: dataSource.data_view_id,
      });

      break;
  }
}

/**
 * Implements only suppression fields
 */
async function inputAlertSuppression(
  fieldFinalSide: HTMLElement,
  value: AlertSuppression | undefined
): Promise<void> {
  await clearEuiComboBoxSelection({
    clearButton: within(fieldFinalSide).getByTestId('comboBoxClearButton'),
  });

  if (!value) {
    return;
  }

  for (const fieldName of value.group_by) {
    await selectEuiComboBoxOption({
      comboBoxToggleButton: within(fieldFinalSide).getByTestId('comboBoxToggleListButton'),
      optionText: fieldName,
    });
  }
}

async function inputAnomalyThreshold(
  fieldFinalSide: HTMLElement,
  value: AnomalyThreshold
): Promise<void> {
  await act(async () => {
    // EuiRange is used for anomaly threshold
    const [riskScoreInput] = within(fieldFinalSide).getAllByTestId('anomalyThresholdRange');

    fireEvent.change(riskScoreInput, {
      target: { value },
    });
  });
}

/**
 * Doesn't support filters and saved queries
 */
async function inputKqlQuery(fieldFinalSide: HTMLElement, value: RuleKqlQuery): Promise<void> {
  if (value.type !== KqlQueryType.inline_query) {
    return;
  }

  await waitFor(() => expect(within(fieldFinalSide).getByRole('textbox')).toBeVisible(), {
    timeout: 500,
  });

  await inputText(fieldFinalSide, value.query);
}

/**
 * Doesn't support filters and EQL options
 */
async function inputEqlQuery(fieldFinalSide: HTMLElement, value: RuleEqlQuery): Promise<void> {
  await waitFor(() => expect(within(fieldFinalSide).getByRole('textbox')).toBeVisible(), {
    timeout: 500,
  });

  await inputText(fieldFinalSide, value.query);
}

async function inputHistoryWindowStart(
  fieldFinalSide: HTMLElement,
  value: HistoryWindowStart
): Promise<void> {
  const valueInput = within(fieldFinalSide).getByTestId('interval');
  const unitInput = within(fieldFinalSide).getByTestId('timeType');

  invariant(value.startsWith('now-'), 'Unable to parse history window start value');

  const parsed = TimeDuration.parse(value.substring(4));

  invariant(parsed, 'Unable to parse history window start value');

  await act(async () => {
    fireEvent.change(valueInput, {
      target: { value: parsed.value },
    });
  });

  await act(async () => {
    fireEvent.change(unitInput, {
      target: { value: parsed.unit },
    });
  });
}

async function inputMachineLearningJobId(
  fieldFinalSide: HTMLElement,
  value: MachineLearningJobId
): Promise<void> {
  const jobIds = [value].flat();

  await clearEuiComboBoxSelection({
    clearButton: within(fieldFinalSide).getByTestId('comboBoxClearButton'),
  });

  for (const jobId of jobIds) {
    await selectEuiComboBoxOption({
      comboBoxToggleButton: within(fieldFinalSide).getByTestId('comboBoxToggleListButton'),
      optionText: jobId,
    });
  }
}

async function inputNewTermsFields(
  fieldFinalSide: HTMLElement,
  value: NewTermsFields
): Promise<void> {
  await clearEuiComboBoxSelection({
    clearButton: within(fieldFinalSide).getByTestId('comboBoxClearButton'),
  });

  for (const fieldName of value) {
    await selectEuiComboBoxOption({
      comboBoxToggleButton: within(fieldFinalSide).getByTestId('comboBoxToggleListButton'),
      optionText: fieldName,
    });
  }
}

async function inputThreatIndex(fieldFinalSide: HTMLElement, value: ThreatIndex): Promise<void> {
  await clearEuiComboBoxSelection({
    clearButton: within(fieldFinalSide).getByTestId('comboBoxClearButton'),
  });

  for (const indexPattern of value) {
    await addEuiComboBoxOption({
      wrapper: fieldFinalSide,
      optionText: indexPattern,
    });
  }
}

/**
 * Doesn't support filters
 */
async function inputThreatQuery(fieldFinalSide: HTMLElement, value: InlineKqlQuery): Promise<void> {
  await waitFor(() => expect(within(fieldFinalSide).getByRole('textbox')).toBeVisible(), {
    timeout: 500,
  });

  await inputText(fieldFinalSide, value.query);
}

async function inputThreshold(fieldFinalSide: HTMLElement, value: Threshold): Promise<void> {
  const groupByFieldsComboBox = within(fieldFinalSide).getByTestId(
    'detectionEngineStepDefineRuleThresholdField'
  );
  const thresholdInput = within(fieldFinalSide).getByTestId(
    'detectionEngineStepDefineRuleThresholdValue'
  );

  await act(async () => {
    const input = within(thresholdInput).getByRole('spinbutton');

    fireEvent.change(input, {
      target: { value: value.value },
    });
  });

  const fields = [value.field].flat();

  await clearEuiComboBoxSelection({
    clearButton: within(groupByFieldsComboBox).getByTestId('comboBoxClearButton'),
  });

  for (const field of fields) {
    await selectEuiComboBoxOption({
      comboBoxToggleButton: within(groupByFieldsComboBox).getByTestId('comboBoxToggleListButton'),
      optionText: field,
    });
  }
}

async function removeExistingItems(
  wrapper: HTMLElement,
  { removeButtonName }: { removeButtonName: string } = { removeButtonName: 'Delete' }
): Promise<void> {
  const deleteButtons = within(wrapper).getAllByRole('button', { name: removeButtonName });

  for (let i = deleteButtons.length - 1; i >= 0; --i) {
    await act(async () => {
      fireEvent.click(deleteButtons[i]);
    });
  }
}
