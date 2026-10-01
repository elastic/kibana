/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCheckbox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiFormControlButton,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import cronstrue from 'cronstrue';
import {
  createTriggerDraft,
  hasDailyLimit,
  isValidCron,
  isValidDailyLimit,
  type AlertStatus,
  type ScheduleUnit,
  type TriggerDraft,
} from './automation_draft';

const labels = {
  triggers: i18n.translate('xpack.nightshift.automations.flyout.triggers', {
    defaultMessage: 'Triggers',
  }),
  change: i18n.translate('xpack.nightshift.automations.flyout.changeTrigger', {
    defaultMessage: 'Change',
  }),
  empty: i18n.translate('xpack.nightshift.automations.flyout.triggersEmpty', {
    defaultMessage: 'Choose what starts this automation.',
  }),
  addTrigger: i18n.translate('xpack.nightshift.automations.addTriggerButton', {
    defaultMessage: 'Add trigger',
  }),
  searchTriggers: i18n.translate('xpack.nightshift.automations.flyout.searchTriggers', {
    defaultMessage: 'Search triggers…',
  }),
  noTriggers: i18n.translate('xpack.nightshift.automations.flyout.noTriggers', {
    defaultMessage: 'No triggers match your search',
  }),
  elastic: i18n.translate('xpack.nightshift.automations.flyout.elasticGroup', {
    defaultMessage: 'Elastic',
  }),
  scheduled: i18n.translate('xpack.nightshift.automations.flyout.scheduledGroup', {
    defaultMessage: 'Scheduled',
  }),
  alertTriggered: i18n.translate('xpack.nightshift.automations.flyout.alertTriggered', {
    defaultMessage: 'Alert triggered',
  }),
  every: i18n.translate('xpack.nightshift.automations.flyout.everyOption', {
    defaultMessage: 'Every…',
  }),
  customCron: i18n.translate('xpack.nightshift.automations.flyout.customCronOption', {
    defaultMessage: 'Custom cron…',
  }),
  whenAnAlert: i18n.translate('xpack.nightshift.automations.flyout.whenAnAlert', {
    defaultMessage: 'When an alert',
  }),
  from: i18n.translate('xpack.nightshift.automations.flyout.from', { defaultMessage: 'from' }),
  changesTo: i18n.translate('xpack.nightshift.automations.flyout.changesTo', {
    defaultMessage: 'changes to',
  }),
  anyRule: i18n.translate('xpack.nightshift.automations.flyout.anyRule', {
    defaultMessage: 'Any rule',
  }),
  ruleName: i18n.translate('xpack.nightshift.automations.ruleNamePatternLabel', {
    defaultMessage: 'Rule name pattern',
  }),
  ruleNameHelp: i18n.translate('xpack.nightshift.automations.ruleNamePatternHelp', {
    defaultMessage: 'Matches rule names that contain this text.',
  }),
  tags: i18n.translate('xpack.nightshift.automations.tagsLabel', { defaultMessage: 'Tags' }),
  anyStatus: i18n.translate('xpack.nightshift.automations.anyStatusOption', {
    defaultMessage: 'Any status',
  }),
  active: i18n.translate('xpack.nightshift.automations.activeOption', { defaultMessage: 'Active' }),
  activeHelp: i18n.translate('xpack.nightshift.automations.flyout.activeHelp', {
    defaultMessage: 'Rule conditions are currently met',
  }),
  recovered: i18n.translate('xpack.nightshift.automations.recoveredOption', {
    defaultMessage: 'Recovered',
  }),
  recoveredHelp: i18n.translate('xpack.nightshift.automations.flyout.recoveredHelp', {
    defaultMessage: 'Rule conditions are no longer met',
  }),
  everyLead: i18n.translate('xpack.nightshift.automations.flyout.everyLead', {
    defaultMessage: 'Every',
  }),
  scheduleUnit: i18n.translate('xpack.nightshift.automations.flyout.scheduleUnit', {
    defaultMessage: 'Schedule unit',
  }),
  hour: i18n.translate('xpack.nightshift.automations.flyout.hour', { defaultMessage: 'Hour' }),
  day: i18n.translate('xpack.nightshift.automations.flyout.day', { defaultMessage: 'Day' }),
  week: i18n.translate('xpack.nightshift.automations.flyout.week', { defaultMessage: 'Week' }),
  at: i18n.translate('xpack.nightshift.automations.flyout.at', { defaultMessage: 'at' }),
  on: i18n.translate('xpack.nightshift.automations.flyout.on', { defaultMessage: 'on' }),
  and: i18n.translate('xpack.nightshift.automations.flyout.and', { defaultMessage: 'and' }),
  betweenHours: i18n.translate('xpack.nightshift.automations.flyout.betweenHours', {
    defaultMessage: 'between hours',
  }),
  time: i18n.translate('xpack.nightshift.automations.flyout.time', { defaultMessage: 'Time' }),
  startTime: i18n.translate('xpack.nightshift.automations.flyout.startTime', {
    defaultMessage: 'Start time',
  }),
  endTime: i18n.translate('xpack.nightshift.automations.flyout.endTime', {
    defaultMessage: 'End time',
  }),
  daysOfWeek: i18n.translate('xpack.nightshift.automations.flyout.daysOfWeek', {
    defaultMessage: 'Days of week',
  }),
  timezone: i18n.translate('xpack.nightshift.automations.flyout.timezone', {
    defaultMessage: 'Timezone',
  }),
  timezonePlaceholder: i18n.translate('xpack.nightshift.automations.flyout.timezonePlaceholder', {
    defaultMessage: 'City or timezone…',
  }),
  customCronLead: i18n.translate('xpack.nightshift.automations.flyout.customCronLead', {
    defaultMessage: 'Custom cron',
  }),
  cronError: i18n.translate('xpack.nightshift.automations.flyout.cronError', {
    defaultMessage: 'Fix the cron expression to save',
  }),
  dailyLimit: i18n.translate('xpack.nightshift.automations.dailyLimitLabel', {
    defaultMessage: 'Daily trigger limit',
  }),
  perDay: i18n.translate('xpack.nightshift.automations.perDayAppend', {
    defaultMessage: 'per day',
  }),
  recommended: i18n.translate('xpack.nightshift.automations.flyout.recommendedLimit', {
    defaultMessage: 'Recommended: 15–20',
  }),
  dailyLimitHelp: i18n.translate('xpack.nightshift.automations.flyout.dailyLimitHelp', {
    defaultMessage: 'When reached, additional triggers are skipped. Resets daily at 12:00 AM UTC.',
  }),
};

const DAYS = [
  { id: '1', label: 'Mon' },
  { id: '2', label: 'Tue' },
  { id: '3', label: 'Wed' },
  { id: '4', label: 'Thu' },
  { id: '5', label: 'Fri' },
  { id: '6', label: 'Sat' },
  { id: '0', label: 'Sun' },
];

const COMMON_TIMEZONE_OFFSETS: Record<string, number> = {
  UTC: 0,
  GMT: 0,
  IST: 5.5,
  PST: -8,
  PDT: -7,
  EST: -5,
  EDT: -4,
  CST: -6,
  CDT: -5,
  MST: -7,
  MDT: -6,
  BST: 1,
  CET: 1,
  CEST: 2,
  JST: 9,
  AEST: 10,
  AEDT: 11,
  NZST: 12,
};

const formatGmtOffset = (hours: number) =>
  hours === 0 ? 'GMT' : `GMT${hours > 0 ? '+' : '-'}${Math.abs(hours)}`;

const getIanaOffset = (timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(new Date())
    .find(({ type }) => type === 'timeZoneName')?.value ?? '';

const TIMEZONE_OPTIONS = [
  ...Object.entries(COMMON_TIMEZONE_OFFSETS).map(([value, offset]) => ({
    value,
    label: value,
    help: formatGmtOffset(offset),
  })),
  ...Intl.supportedValuesOf('timeZone')
    .filter((value) => !(value in COMMON_TIMEZONE_OFFSETS))
    .map((value) => ({ value, label: value, help: getIanaOffset(value) })),
];

const TriggerPicker = ({
  button,
  current,
  onSelect,
}: {
  button: (toggle: () => void) => React.ReactElement;
  current?: TriggerDraft['kind'];
  onSelect: (kind: TriggerDraft['kind']) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const groupLabelCss = { paddingInline: euiTheme.size.s };
  const options: Array<EuiSelectableOption<{ kind?: TriggerDraft['kind'] }>> = [
    { label: labels.elastic, isGroupLabel: true, css: groupLabelCss },
    {
      label: labels.alertTriggered,
      kind: 'alert',
      prepend: <EuiIcon type="logoElastic" aria-hidden={true} />,
    },
    { label: labels.scheduled, isGroupLabel: true, css: groupLabelCss },
    { label: labels.every, kind: 'every', prepend: <EuiIcon type="calendar" aria-hidden={true} /> },
    {
      label: labels.customCron,
      kind: 'cron',
      prepend: <EuiIcon type="clock" aria-hidden={true} />,
    },
  ].map((option) => ({
    ...option,
    checked: 'kind' in option && option.kind === current ? 'on' : undefined,
  })) as Array<EuiSelectableOption<{ kind?: TriggerDraft['kind'] }>>;

  return (
    <EuiPopover
      aria-label={labels.addTrigger}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={button(() => setIsOpen((open) => !open))}
    >
      <EuiSelectable
        aria-label={labels.addTrigger}
        searchable
        singleSelection
        searchProps={{ placeholder: labels.searchTriggers, compressed: true }}
        noMatchesMessage={labels.noTriggers}
        options={options}
        onChange={(_options, _event, changed) => {
          if (changed.kind) onSelect(changed.kind);
          setIsOpen(false);
        }}
        listProps={{ bordered: false, showIcons: false, paddingSize: 's' }}
      >
        {(list, search) => (
          <div css={{ width: 280 }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const PillPopover = ({
  label,
  ariaLabel,
  children,
  testSubject,
}: {
  label: string;
  ariaLabel: string;
  children: (close: () => void) => React.ReactNode;
  testSubject: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiPopover
      aria-label={ariaLabel}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      button={
        <EuiFormControlButton
          compressed
          fullWidth={false}
          value={label}
          aria-label={ariaLabel}
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj={testSubject}
        />
      }
    >
      {children(() => setIsOpen(false))}
    </EuiPopover>
  );
};

const SelectPill = <T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  searchPlaceholder,
  testSubject,
}: {
  ariaLabel: string;
  value: T;
  options: Array<{ value: T; label: string; help?: string }>;
  onChange: (value: T) => void;
  searchPlaceholder?: string;
  testSubject: string;
}) => (
  <PillPopover
    ariaLabel={ariaLabel}
    label={options.find((option) => option.value === value)?.label ?? value}
    testSubject={testSubject}
  >
    {(close) => {
      const selectableProps = {
        'aria-label': ariaLabel,
        singleSelection: 'always' as const,
        options: options.map((option) => ({
          key: option.value,
          label: option.label,
          value: option.value,
          checked: option.value === value ? ('on' as const) : undefined,
          ...(option.help && {
            append: (
              <EuiText size="xs" color="subdued">
                {option.help}
              </EuiText>
            ),
          }),
        })),
        onChange: (
          _options: Array<EuiSelectableOption<{ value: T }>>,
          _event: unknown,
          changed: EuiSelectableOption<{ value: T }>
        ) => {
          onChange(changed.value);
          close();
        },
        listProps: { bordered: false, paddingSize: 's' as const },
      };
      return searchPlaceholder ? (
        <EuiSelectable<{ value: T }>
          {...selectableProps}
          searchable
          searchProps={{ placeholder: searchPlaceholder, compressed: true }}
          height={300}
        >
          {(list, search) => (
            <div css={{ width: 260 }}>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      ) : (
        <EuiSelectable<{ value: T }> {...selectableProps}>
          {(list) => <div css={{ minWidth: 200 }}>{list}</div>}
        </EuiSelectable>
      );
    }}
  </PillPopover>
);

const Sentence = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
    {React.Children.map(
      children,
      (child) => child && <EuiFlexItem grow={false}>{child}</EuiFlexItem>
    )}
  </EuiFlexGroup>
);

const TimezonePicker = ({
  timezone,
  onChange,
}: {
  timezone: string;
  onChange: (timezone: string) => void;
}) => (
  <SelectPill
    ariaLabel={labels.timezone}
    value={timezone}
    options={TIMEZONE_OPTIONS}
    onChange={onChange}
    searchPlaceholder={labels.timezonePlaceholder}
    testSubject="automationTimezone"
  />
);

const TimeField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <EuiFieldText
    data-test-subj="nightshiftTimeFieldFieldText"
    type="time"
    compressed
    aria-label={label}
    value={value}
    onChange={(event) => event.target.value && onChange(event.target.value)}
  />
);

const ALERT_STATUSES = ['active', 'inactive'] as const;

const AlertStatusPicker = ({
  status,
  onChange,
}: {
  status: AlertStatus;
  onChange: (status: AlertStatus) => void;
}) => {
  const statusLabels = { active: labels.active, inactive: labels.recovered };
  const statusHelp = { active: labels.activeHelp, inactive: labels.recoveredHelp };
  const selected = status === 'any' ? [] : [status];

  return (
    <PillPopover
      ariaLabel={labels.anyStatus}
      label={status === 'any' ? labels.anyStatus : statusLabels[status]}
      testSubject="automationStatusPicker"
    >
      {() => (
        <EuiSelectable<{ value: Exclude<AlertStatus, 'any'> }>
          aria-label={labels.anyStatus}
          options={ALERT_STATUSES.map((value) => ({
            key: value,
            value,
            label: statusLabels[value],
            checked: selected.includes(value) ? 'on' : undefined,
          }))}
          renderOption={({ label, value }) => (
            <>
              <EuiText size="s">{label}</EuiText>
              <EuiText size="xs" color="subdued">
                {statusHelp[value]}
              </EuiText>
            </>
          )}
          onChange={(options) => {
            const checked = options.filter((option) => option.checked === 'on');
            onChange(checked.length === 1 ? checked[0].value : 'any');
          }}
          listProps={{ bordered: false, paddingSize: 's', rowHeight: 56, isVirtualized: false }}
        >
          {(list) => <div css={{ width: 300 }}>{list}</div>}
        </EuiSelectable>
      )}
    </PillPopover>
  );
};

const AlertTriggerEditor = ({
  trigger,
  onChange,
}: {
  trigger: Extract<TriggerDraft, { kind: 'alert' }>;
  onChange: (trigger: TriggerDraft) => void;
}) => {
  return (
    <Sentence>
      <EuiIcon type="logoElastic" aria-hidden={true} />
      <EuiText size="s">
        <strong>{labels.whenAnAlert}</strong>
      </EuiText>
      <EuiText size="s">{labels.from}</EuiText>
      <PillPopover
        ariaLabel={labels.anyRule}
        label={
          [trigger.ruleNamePattern.trim(), ...trigger.ruleTags].filter(Boolean).join(', ') ||
          labels.anyRule
        }
        testSubject="automationRulePicker"
      >
        {() => (
          <EuiPanel paddingSize="s" hasShadow={false} color="transparent" css={{ width: 300 }}>
            <EuiFormRow label={labels.ruleName} helpText={labels.ruleNameHelp}>
              <EuiFieldText
                compressed
                value={trigger.ruleNamePattern}
                onChange={(event) => onChange({ ...trigger, ruleNamePattern: event.target.value })}
                data-test-subj="automationRuleNamePattern"
              />
            </EuiFormRow>
            <EuiFormRow label={labels.tags}>
              <EuiComboBox
                compressed
                noSuggestions
                selectedOptions={trigger.ruleTags.map((tag) => ({ label: tag }))}
                onCreateOption={(tag) =>
                  onChange({ ...trigger, ruleTags: [...new Set([...trigger.ruleTags, tag])] })
                }
                onChange={(options) =>
                  onChange({ ...trigger, ruleTags: options.map(({ label }) => label) })
                }
              />
            </EuiFormRow>
          </EuiPanel>
        )}
      </PillPopover>
      <EuiText size="s">{labels.changesTo}</EuiText>
      <AlertStatusPicker
        status={trigger.alertStatus}
        onChange={(alertStatus) => onChange({ ...trigger, alertStatus })}
      />
    </Sentence>
  );
};

const EveryTriggerEditor = ({
  trigger,
  onChange,
}: {
  trigger: Extract<TriggerDraft, { kind: 'every' }>;
  onChange: (trigger: TriggerDraft) => void;
}) => (
  <Sentence>
    <EuiIcon type="calendar" aria-hidden={true} />
    <EuiText size="s">{labels.everyLead}</EuiText>
    <SelectPill<ScheduleUnit>
      ariaLabel={labels.scheduleUnit}
      value={trigger.unit}
      options={[
        { value: 'hour', label: labels.hour },
        { value: 'day', label: labels.day },
        { value: 'week', label: labels.week },
      ]}
      onChange={(unit) => onChange({ ...trigger, unit })}
      testSubject="automationScheduleUnit"
    />
    {trigger.unit === 'hour' && (
      <EuiCheckbox
        id="automationBetweenHours"
        label={labels.betweenHours}
        checked={trigger.betweenHours}
        onChange={(event) => onChange({ ...trigger, betweenHours: event.target.checked })}
      />
    )}
    {trigger.unit === 'hour' && trigger.betweenHours && (
      <TimeField
        label={labels.startTime}
        value={trigger.startTime}
        onChange={(startTime) => onChange({ ...trigger, startTime })}
      />
    )}
    {trigger.unit === 'hour' && trigger.betweenHours && <EuiText size="s">{labels.and}</EuiText>}
    {trigger.unit === 'hour' && trigger.betweenHours && (
      <TimeField
        label={labels.endTime}
        value={trigger.endTime}
        onChange={(endTime) => onChange({ ...trigger, endTime })}
      />
    )}
    {trigger.unit === 'week' && <EuiText size="s">{labels.on}</EuiText>}
    {trigger.unit === 'week' && (
      <EuiButtonGroup
        legend={labels.daysOfWeek}
        type="multi"
        buttonSize="compressed"
        options={DAYS}
        idToSelectedMap={Object.fromEntries(trigger.daysOfWeek.map((day) => [String(day), true]))}
        onChange={(id) => {
          const day = Number(id);
          onChange({
            ...trigger,
            daysOfWeek: trigger.daysOfWeek.includes(day)
              ? trigger.daysOfWeek.filter((selected) => selected !== day)
              : [...trigger.daysOfWeek, day],
          });
        }}
      />
    )}
    {trigger.unit !== 'hour' && <EuiText size="s">{labels.at}</EuiText>}
    {trigger.unit !== 'hour' && (
      <TimeField
        label={labels.time}
        value={trigger.time}
        onChange={(time) => onChange({ ...trigger, time })}
      />
    )}
    {(trigger.unit !== 'hour' || trigger.betweenHours) && (
      <TimezonePicker
        timezone={trigger.timezone}
        onChange={(timezone) => onChange({ ...trigger, timezone })}
      />
    )}
  </Sentence>
);

const describeCron = (expression: string): string =>
  cronstrue.toString(expression, { use24HourTimeFormat: false, verbose: false });

const CronTriggerEditor = ({
  trigger,
  onChange,
}: {
  trigger: Extract<TriggerDraft, { kind: 'cron' }>;
  onChange: (trigger: TriggerDraft) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const isInvalid = !isValidCron(trigger.cronExpression);
  return (
    <>
      <Sentence>
        <EuiIcon type="calendar" aria-hidden={true} />
        <EuiText size="s">{labels.customCronLead}</EuiText>
        <EuiFieldText
          compressed
          aria-label={labels.customCronLead}
          placeholder="0 9 * * *"
          isInvalid={isInvalid}
          value={trigger.cronExpression}
          onChange={(event) => onChange({ ...trigger, cronExpression: event.target.value })}
          data-test-subj="automationCronExpression"
        />
        <TimezonePicker
          timezone={trigger.timezone}
          onChange={(timezone) => onChange({ ...trigger, timezone })}
        />
      </Sentence>
      <EuiText
        size="xs"
        color={isInvalid ? 'danger' : 'subdued'}
        css={{ paddingInlineStart: euiTheme.size.l, marginBlockStart: euiTheme.size.xs }}
        data-test-subj="automationCronDescription"
      >
        {isInvalid
          ? labels.cronError
          : `${describeCron(trigger.cronExpression)} (${trigger.timezone})`}
      </EuiText>
    </>
  );
};

export const AutomationTriggerSection = ({
  trigger,
  dailyDispatchLimit,
  onTriggerChange,
  onDailyDispatchLimitChange,
}: {
  trigger?: TriggerDraft;
  dailyDispatchLimit: string;
  onTriggerChange: (trigger: TriggerDraft) => void;
  onDailyDispatchLimitChange: (value: string) => void;
}) => {
  const [stashedTriggers, setStashedTriggers] = useState<
    Partial<Record<TriggerDraft['kind'], TriggerDraft>>
  >({});
  const selectTrigger = (kind: TriggerDraft['kind']) => {
    if (trigger) setStashedTriggers((stash) => ({ ...stash, [trigger.kind]: trigger }));
    onTriggerChange(stashedTriggers[kind] ?? createTriggerDraft(kind));
  };

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{labels.triggers}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {trigger && (
          <EuiFlexItem grow={false}>
            <TriggerPicker
              current={trigger.kind}
              onSelect={selectTrigger}
              button={(toggle) => (
                <EuiButtonEmpty
                  size="xs"
                  color="text"
                  onClick={toggle}
                  data-test-subj="automationChangeTrigger"
                >
                  {labels.change}
                </EuiButtonEmpty>
              )}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        {!trigger && (
          <>
            <EuiText size="s" color="subdued">
              {labels.empty}
            </EuiText>
            <EuiSpacer size="s" />
            <TriggerPicker
              onSelect={selectTrigger}
              button={(toggle) => (
                <EuiButtonEmpty
                  iconType="plus"
                  color="text"
                  flush="left"
                  onClick={toggle}
                  data-test-subj="automationAddTrigger"
                >
                  {labels.addTrigger}
                </EuiButtonEmpty>
              )}
            />
          </>
        )}
        {trigger?.kind === 'alert' && (
          <AlertTriggerEditor trigger={trigger} onChange={onTriggerChange} />
        )}
        {trigger?.kind === 'every' && (
          <EveryTriggerEditor trigger={trigger} onChange={onTriggerChange} />
        )}
        {trigger?.kind === 'cron' && (
          <CronTriggerEditor trigger={trigger} onChange={onTriggerChange} />
        )}
        {hasDailyLimit(trigger) && (
          <>
            <EuiHorizontalRule margin="m" />
            <Sentence>
              <EuiText size="s">
                <strong>{labels.dailyLimit}</strong>
              </EuiText>
              <div css={{ width: 180 }}>
                <EuiFieldNumber
                  compressed
                  aria-label={labels.dailyLimit}
                  min={1}
                  max={200}
                  step={1}
                  value={dailyDispatchLimit}
                  isInvalid={!isValidDailyLimit(dailyDispatchLimit)}
                  append={labels.perDay}
                  onChange={(event) => onDailyDispatchLimitChange(event.target.value)}
                  fullWidth
                  data-test-subj="automationDailyLimit"
                />
              </div>
              <EuiBadge color="success">{labels.recommended}</EuiBadge>
            </Sentence>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {labels.dailyLimitHelp}
            </EuiText>
          </>
        )}
      </EuiPanel>
    </>
  );
};
