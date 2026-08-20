/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';

import { isProtectionEventCode } from '../../../common/detonate';
import { osFamilyLabel, protectionLabel } from '../labels';
import type { DetonationFilters } from '../transforms';
import { hasActiveFilters } from '../transforms';
import {
  FILTER_CLEAR_ALL,
  FILTER_FAMILY,
  FILTER_HASH_ARIA,
  FILTER_HASH_PLACEHOLDER,
  FILTER_ONLY_NAMED,
  FILTER_ONLY_NAMED_TOOLTIP,
  FILTER_ONLY_WITH_ALERTS,
  FILTER_ONLY_WITH_ALERTS_TOOLTIP,
  FILTER_PLATFORM,
  FILTER_PROTECTION,
  FILTER_SOURCE,
} from '../translations';

const toOptions = (
  values: string[],
  renderLabel: (value: string) => string
): Array<EuiComboBoxOptionOption<string>> =>
  values.map((value) => ({ key: value, label: renderLabel(value), value }));

const selectedOptions = (
  values: string[],
  renderLabel: (value: string) => string
): Array<EuiComboBoxOptionOption<string>> => toOptions(values, renderLabel);

const toValues = (options: Array<EuiComboBoxOptionOption<string>>): string[] =>
  options.map(({ value, label }) => value ?? label);

const identity = (value: string) => value;

export interface DetonationFiltersBarProps {
  filters: DetonationFilters;
  onChange: (next: Partial<DetonationFilters>) => void;
  onReset: () => void;
  familyOptions: string[];
  protectionOptions: string[];
  platformOptions: string[];
  sourceOptions: string[];
}

/**
 * Field-specific filters over the loaded detonations.
 *
 * These are deliberately structured rather than a KQL bar: the underlying fields are internal
 * task-document names such as `task.production_endpoint_alert_groups.rule_name`, which nobody
 * would guess, and the page reads an index that is not part of the Security data view the shared
 * query bar is bound to.
 */
const DetonationFiltersBarComponent: React.FC<DetonationFiltersBarProps> = ({
  filters,
  onChange,
  onReset,
  familyOptions,
  protectionOptions,
  platformOptions,
  sourceOptions,
}) => {
  const onHashChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onChange({ hash: event.target.value }),
    [onChange]
  );

  const onFamiliesChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => onChange({ families: toValues(options) }),
    [onChange]
  );

  const onProtectionsChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) =>
      onChange({ protections: toValues(options).filter(isProtectionEventCode) }),
    [onChange]
  );

  const onPlatformsChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => onChange({ platforms: toValues(options) }),
    [onChange]
  );

  const onSourcesChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => onChange({ sources: toValues(options) }),
    [onChange]
  );

  const toggleOnlyWithAlerts = useCallback(
    () => onChange({ onlyWithAlerts: !filters.onlyWithAlerts }),
    [onChange, filters.onlyWithAlerts]
  );

  const toggleOnlyNamedThreats = useCallback(
    () => onChange({ onlyNamedThreats: !filters.onlyNamedThreats }),
    [onChange, filters.onlyNamedThreats]
  );

  const familyComboOptions = useMemo(() => toOptions(familyOptions, identity), [familyOptions]);
  const protectionComboOptions = useMemo(
    () => toOptions(protectionOptions, protectionLabel),
    [protectionOptions]
  );
  const platformComboOptions = useMemo(
    () => toOptions(platformOptions, osFamilyLabel),
    [platformOptions]
  );
  const sourceComboOptions = useMemo(() => toOptions(sourceOptions, identity), [sourceOptions]);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="detonateFiltersBar">
      <EuiFlexGroup gutterSize="m" wrap alignItems="flexEnd">
        <EuiFlexItem grow={2} css={{ minWidth: 260 }}>
          <EuiFormRow label={FILTER_HASH_ARIA} fullWidth>
            <EuiFieldSearch
              fullWidth
              incremental
              value={filters.hash}
              onChange={onHashChange}
              placeholder={FILTER_HASH_PLACEHOLDER}
              aria-label={FILTER_HASH_ARIA}
              data-test-subj="detonateHashFilter"
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={2} css={{ minWidth: 200 }}>
          <EuiFormRow label={FILTER_FAMILY} fullWidth>
            <EuiComboBox
              fullWidth
              options={familyComboOptions}
              selectedOptions={selectedOptions(filters.families, identity)}
              onChange={onFamiliesChange}
              aria-label={FILTER_FAMILY}
              data-test-subj="detonateFamilyFilter"
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={2} css={{ minWidth: 200 }}>
          <EuiFormRow label={FILTER_PROTECTION} fullWidth>
            <EuiComboBox
              fullWidth
              options={protectionComboOptions}
              selectedOptions={selectedOptions(filters.protections, protectionLabel)}
              onChange={onProtectionsChange}
              aria-label={FILTER_PROTECTION}
              data-test-subj="detonateProtectionFilter"
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={1} css={{ minWidth: 160 }}>
          <EuiFormRow label={FILTER_PLATFORM} fullWidth>
            <EuiComboBox
              fullWidth
              options={platformComboOptions}
              selectedOptions={selectedOptions(filters.platforms, osFamilyLabel)}
              onChange={onPlatformsChange}
              aria-label={FILTER_PLATFORM}
              data-test-subj="detonatePlatformFilter"
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={1} css={{ minWidth: 160 }}>
          <EuiFormRow label={FILTER_SOURCE} fullWidth>
            <EuiComboBox
              fullWidth
              options={sourceComboOptions}
              selectedOptions={selectedOptions(filters.sources, identity)}
              onChange={onSourcesChange}
              aria-label={FILTER_SOURCE}
              data-test-subj="detonateSourceFilter"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="m" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={FILTER_ONLY_WITH_ALERTS_TOOLTIP}>
            <EuiSwitch
              label={FILTER_ONLY_WITH_ALERTS}
              checked={filters.onlyWithAlerts}
              onChange={toggleOnlyWithAlerts}
              compressed
              data-test-subj="detonateOnlyWithAlertsToggle"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={FILTER_ONLY_NAMED_TOOLTIP}>
            <EuiSwitch
              label={FILTER_ONLY_NAMED}
              checked={filters.onlyNamedThreats}
              onChange={toggleOnlyNamedThreats}
              compressed
              data-test-subj="detonateOnlyNamedToggle"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {hasActiveFilters(filters) && (
            <EuiButtonEmpty
              size="s"
              iconType="cross"
              onClick={onReset}
              data-test-subj="detonateClearFilters"
            >
              {FILTER_CLEAR_ALL}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const DetonationFiltersBar = React.memo(DetonationFiltersBarComponent);
