/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiCheckbox,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiTabbedContentTab } from '@elastic/eui';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { createRule, createSlo } from './api';
import { DATA_TYPE_META, type SynthtraceDataType } from './data_types';
import {
  buildAlertRulePreviews,
  buildRecommendedRules,
  buildRecommendedSlos,
  buildSloPreviews,
  ENVIRONMENT_ALL,
  PRESET_IDS,
  PRESETS,
  type AlertRulePreview,
  type PresetId,
  type SloPreview,
} from './recommended_config';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  environments: string[];
  isLoadingEnvironments: boolean;
}

const ALL_ENVIRONMENTS_LABEL = i18n.translate(
  'xpack.observability_onboarding.demoData.alertsSlos.allEnvironments',
  { defaultMessage: 'All environments' }
);

const PREVIEW_DATA_TYPE_ORDER: SynthtraceDataType[] = ['apm', 'logs', 'infra'];

const groupPreviewsByDataType = <T extends { dataType: SynthtraceDataType }>(
  previews: T[]
): Array<{ dataType: SynthtraceDataType; items: T[] }> =>
  PREVIEW_DATA_TYPE_ORDER.flatMap((dataType) => {
    const items = previews.filter((preview) => preview.dataType === dataType);
    return items.length > 0 ? [{ dataType, items }] : [];
  });

type PreviewKind = 'alert' | 'slo';

const previewKey = (kind: PreviewKind, name: string): string => `${kind}:${name}`;

const toCheckboxId = (key: string): string =>
  `demoDataPreview-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

interface PreviewRowProps {
  preview: AlertRulePreview | SloPreview;
  detailLabel: string;
  checkboxId: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}

const PreviewRow: React.FC<PreviewRowProps> = ({
  preview,
  detailLabel,
  checkboxId,
  checked,
  onToggle,
}) => (
  <EuiFlexGroup alignItems="flexStart" gutterSize="s" css={css({ marginBottom: '8px' })}>
    <EuiFlexItem grow={false}>
      <EuiCheckbox
        id={checkboxId}
        checked={checked}
        onChange={(event) => onToggle(event.target.checked)}
        aria-label={preview.name}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type={DATA_TYPE_META[preview.dataType].iconType} size="m" aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiDescriptionList
        compressed
        listItems={[
          { title: preview.name, description: preview.description },
          { title: detailLabel, description: preview.detail },
        ]}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const buildSignalTabs = (
  groups: Array<{ dataType: SynthtraceDataType; items: Array<AlertRulePreview | SloPreview> }>,
  detailLabel: string,
  kind: PreviewKind,
  excluded: Set<string>,
  onToggle: (key: string, checked: boolean) => void
): EuiTabbedContentTab[] =>
  groups.map(({ dataType, items }) => ({
    id: dataType,
    name: DATA_TYPE_META[dataType].label,
    prepend: <EuiIcon type={DATA_TYPE_META[dataType].iconType} size="m" aria-hidden={true} />,
    content: (
      <>
        <EuiSpacer size="m" />
        {items.map((preview) => {
          const key = previewKey(kind, preview.name);
          return (
            <PreviewRow
              key={key}
              preview={preview}
              detailLabel={detailLabel}
              checkboxId={toCheckboxId(key)}
              checked={!excluded.has(key)}
              onToggle={(checked) => onToggle(key, checked)}
            />
          );
        })}
      </>
    ),
  }));

export const AlertsSlosPanel: React.FC<Props> = ({
  http,
  notifications,
  environments,
  isLoadingEnvironments,
}) => {
  const [environment, setEnvironment] = useState<string>(ENVIRONMENT_ALL);
  const [preset, setPreset] = useState<PresetId>('recommended');
  const [isCreating, setIsCreating] = useState(false);
  /** Keys (`alert:<name>` / `slo:<name>`) the user has unchecked. Empty = all selected. */
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((key: string, checked: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const setAllSelection = useCallback((kind: PreviewKind, names: string[], select: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      names.forEach((name) => {
        const key = previewKey(kind, name);
        if (select) {
          next.delete(key);
        } else {
          next.add(key);
        }
      });
      return next;
    });
  }, []);

  const environmentOptions = [
    { value: ENVIRONMENT_ALL, text: ALL_ENVIRONMENTS_LABEL },
    ...environments.map((env) => ({ value: env, text: env })),
  ];

  const presetOptions = PRESET_IDS.map((presetId) => ({
    id: presetId,
    label: PRESETS[presetId].label,
  }));

  const alertPreviews = useMemo(
    () => buildAlertRulePreviews({ environment, preset }),
    [environment, preset]
  );
  const sloPreviews = useMemo(
    () => buildSloPreviews({ environment, preset }),
    [environment, preset]
  );

  const alertsAccordionId = useGeneratedHtmlId({ prefix: 'demoDataAlertsPreview' });
  const slosAccordionId = useGeneratedHtmlId({ prefix: 'demoDataSlosPreview' });

  const alertThresholdLabel = i18n.translate(
    'xpack.observability_onboarding.demoData.alertsSlos.previewThresholdLabel',
    { defaultMessage: 'Threshold' }
  );
  const sloObjectiveLabel = i18n.translate(
    'xpack.observability_onboarding.demoData.alertsSlos.previewObjectiveLabel',
    { defaultMessage: 'Objective' }
  );

  const alertTabs = useMemo(
    () =>
      buildSignalTabs(
        groupPreviewsByDataType(alertPreviews),
        alertThresholdLabel,
        'alert',
        excluded,
        toggleSelection
      ),
    [alertPreviews, alertThresholdLabel, excluded, toggleSelection]
  );
  const sloTabs = useMemo(
    () =>
      buildSignalTabs(
        groupPreviewsByDataType(sloPreviews),
        sloObjectiveLabel,
        'slo',
        excluded,
        toggleSelection
      ),
    [sloPreviews, sloObjectiveLabel, excluded, toggleSelection]
  );

  const selectedAlerts = useMemo(
    () => alertPreviews.filter((preview) => !excluded.has(previewKey('alert', preview.name))),
    [alertPreviews, excluded]
  );
  const selectedSlos = useMemo(
    () => sloPreviews.filter((preview) => !excluded.has(previewKey('slo', preview.name))),
    [sloPreviews, excluded]
  );

  const allAlertsSelected = selectedAlerts.length === alertPreviews.length;
  const allSlosSelected = selectedSlos.length === sloPreviews.length;
  const nothingSelected = selectedAlerts.length === 0 && selectedSlos.length === 0;

  const onCreate = async () => {
    setIsCreating(true);

    const rules = buildRecommendedRules({ environment, preset }).filter(
      (rule) => !excluded.has(previewKey('alert', rule.name))
    );
    const slos = buildRecommendedSlos({ environment, preset }).filter(
      (slo) => !excluded.has(previewKey('slo', slo.name))
    );

    const results = await Promise.allSettled([
      ...rules.map((rule) => createRule(http, rule)),
      ...slos.map((slo) => createSlo(http, slo)),
    ]);

    const failures = results.filter((result) => result.status === 'rejected');

    setIsCreating(false);

    if (failures.length === 0) {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.observability_onboarding.demoData.alertsSlos.successToast', {
          defaultMessage: 'Created {ruleCount} recommended alert rules and {sloCount} SLOs.',
          values: { ruleCount: rules.length, sloCount: slos.length },
        })
      );
      return;
    }

    notifications.toasts.addWarning({
      title: i18n.translate('xpack.observability_onboarding.demoData.alertsSlos.partialToast', {
        defaultMessage: '{failureCount} of {total} resources could not be created.',
        values: { failureCount: failures.length, total: results.length },
      }),
      text: i18n.translate('xpack.observability_onboarding.demoData.alertsSlos.partialToastText', {
        defaultMessage:
          'SLOs require a Platinum license and you need privileges to manage APM, logs, infrastructure rules, and SLOs.',
      }),
    });
  };

  return (
    <>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.demoData.alertsSlos.description"
            defaultMessage="Create a curated set of SRE-recommended alert rules and SLOs across APM, logs, and infrastructure for the selected environment."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="flexEnd" gutterSize="m" wrap>
        <EuiFlexItem grow={false} css={{ width: 280 }}>
          <EuiFormRow
            label={i18n.translate('xpack.observability_onboarding.demoData.alertsSlos.envLabel', {
              defaultMessage: 'Environment',
            })}
          >
            <EuiSelect
              data-test-subj="observabilityOnboardingDemoDataAlertsEnvironmentSelect"
              options={environmentOptions}
              value={environment}
              isLoading={isLoadingEnvironments}
              onChange={(event) => setEnvironment(event.target.value)}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability_onboarding.demoData.alertsSlos.presetLabel',
              {
                defaultMessage: 'Starting preset',
              }
            )}
            fullWidth
          >
            <EuiButtonGroup
              data-test-subj="observabilityOnboardingDemoDataAlertsPresetGroup"
              legend={i18n.translate(
                'xpack.observability_onboarding.demoData.alertsSlos.presetLegend',
                { defaultMessage: 'Alert and SLO threshold preset' }
              )}
              options={presetOptions}
              idSelected={preset}
              onChange={(id) => setPreset(id as PresetId)}
              buttonSize="m"
              isFullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="observabilityOnboardingDemoDataCreateAlertsSlosButton"
            fill
            isLoading={isCreating}
            disabled={nothingSelected}
            onClick={onCreate}
          >
            <FormattedMessage
              id="xpack.observability_onboarding.demoData.alertsSlos.createButton"
              defaultMessage="Create {count, plural, =0 {selected} one {# selected item} other {# selected items}}"
              values={{ count: selectedAlerts.length + selectedSlos.length }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiText size="xs" color="subdued">
        <p>{PRESETS[preset].description}</p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="xpack.observability_onboarding.demoData.alertsSlos.previewTitle"
              defaultMessage="Will create {alertCount, plural, one {# alert} other {# alerts}} and {sloCount, plural, one {# SLO} other {# SLOs}}"
              values={{ alertCount: selectedAlerts.length, sloCount: selectedSlos.length }}
            />
          </h4>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiAccordion
          id={alertsAccordionId}
          initialIsOpen
          buttonContent={
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.observability_onboarding.demoData.alertsSlos.previewAlertsHeading"
                  defaultMessage="Alert rules ({selected} of {total} selected)"
                  values={{ selected: selectedAlerts.length, total: alertPreviews.length }}
                />
              </strong>
            </EuiText>
          }
          extraAction={
            alertPreviews.length > 0 ? (
              <EuiButtonEmpty
                data-test-subj="observabilityOnboardingAlertsSlosPanelButton"
                size="xs"
                onClick={() =>
                  setAllSelection(
                    'alert',
                    alertPreviews.map((preview) => preview.name),
                    !allAlertsSelected
                  )
                }
              >
                {allAlertsSelected ? (
                  <FormattedMessage
                    id="xpack.observability_onboarding.demoData.alertsSlos.deselectAllAlerts"
                    defaultMessage="Deselect all"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.observability_onboarding.demoData.alertsSlos.selectAllAlerts"
                    defaultMessage="Select all"
                  />
                )}
              </EuiButtonEmpty>
            ) : undefined
          }
        >
          <EuiSpacer size="s" />
          {alertTabs.length > 0 ? (
            <EuiTabbedContent
              key={alertTabs.map((tab) => tab.id).join('-')}
              size="s"
              tabs={alertTabs}
              initialSelectedTab={alertTabs[0]}
            />
          ) : (
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.observability_onboarding.demoData.alertsSlos.previewEmpty"
                  defaultMessage="Nothing will be created for this preset."
                />
              </p>
            </EuiText>
          )}
        </EuiAccordion>

        <EuiSpacer size="m" />

        <EuiAccordion
          id={slosAccordionId}
          initialIsOpen
          buttonContent={
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.observability_onboarding.demoData.alertsSlos.previewSlosHeading"
                  defaultMessage="SLOs ({selected} of {total} selected)"
                  values={{ selected: selectedSlos.length, total: sloPreviews.length }}
                />
              </strong>
            </EuiText>
          }
          extraAction={
            sloPreviews.length > 0 ? (
              <EuiButtonEmpty
                data-test-subj="observabilityOnboardingAlertsSlosPanelButton"
                size="xs"
                onClick={() =>
                  setAllSelection(
                    'slo',
                    sloPreviews.map((preview) => preview.name),
                    !allSlosSelected
                  )
                }
              >
                {allSlosSelected ? (
                  <FormattedMessage
                    id="xpack.observability_onboarding.demoData.alertsSlos.deselectAllSlos"
                    defaultMessage="Deselect all"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.observability_onboarding.demoData.alertsSlos.selectAllSlos"
                    defaultMessage="Select all"
                  />
                )}
              </EuiButtonEmpty>
            ) : undefined
          }
        >
          <EuiSpacer size="s" />
          {sloTabs.length > 0 ? (
            <EuiTabbedContent
              key={sloTabs.map((tab) => tab.id).join('-')}
              size="s"
              tabs={sloTabs}
              initialSelectedTab={sloTabs[0]}
            />
          ) : (
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.observability_onboarding.demoData.alertsSlos.previewSlosEmpty"
                  defaultMessage="Nothing will be created for this preset."
                />
              </p>
            </EuiText>
          )}
        </EuiAccordion>
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.demoData.alertsSlos.reviewNote"
            defaultMessage="These are recommended starting values. Review and adjust thresholds, objectives, and notification actions after creation."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiCallOut
        size="s"
        iconType="info"
        title={i18n.translate('xpack.observability_onboarding.demoData.alertsSlos.licenseCallout', {
          defaultMessage: 'SLO creation requires a Platinum (or trial) license.',
        })}
      />
    </>
  );
};
