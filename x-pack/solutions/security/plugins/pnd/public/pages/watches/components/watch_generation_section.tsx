/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFieldNumber, EuiFormRow, EuiSelect, EuiSpacer, EuiSuperSelect } from '@elastic/eui';
import type { WatchGenerationSettings } from '@kbn/pnd-common';
import { useAdConnectors } from '../../../components/ad_worker_config/use_ad_connectors';
import { SettingsSection } from './settings_section';
import * as i18n from '../settings_translations';

interface WatchGenerationSectionProps {
  generation: WatchGenerationSettings;
  onAlertSizeChange: (alertSize: number) => void;
  onLookbackChange: (lookback: string) => void;
  onConnectorChange: (connectorId: string) => void;
}

/** The empty connector id is the schema's spelling of "the server-resolved default AI connector". */
const DEFAULT_CONNECTOR_VALUE = '';

/**
 * The alert windows the select offers. A stored value outside this list — a hand-edited document, or
 * a vocabulary an older release offered — is appended as its own option rather than silently snapped
 * to the first entry, so an untouched page round-trips the value it was given.
 */
const LOOKBACK_OPTION_IDS = ['now-24h', 'now-48h', 'now-7d'];

/**
 * The Generation section, offered only by the Attack Discovery Generation watch: how many alerts each
 * run reads, how far back it looks, and which AI connector it generates with. Every control edits the
 * page's draft; nothing here writes until Save.
 */
export const WatchGenerationSection: React.FC<WatchGenerationSectionProps> = ({
  generation,
  onAlertSizeChange,
  onLookbackChange,
  onConnectorChange,
}) => {
  const { data: connectors = [], isLoading } = useAdConnectors();

  const lookbackOptions = useMemo(() => {
    const optionIds = LOOKBACK_OPTION_IDS.includes(generation.lookback)
      ? LOOKBACK_OPTION_IDS
      : [...LOOKBACK_OPTION_IDS, generation.lookback];
    return optionIds.map((optionId) => ({
      value: optionId,
      text: i18n.LOOKBACK_OPTION_LABELS[optionId] ?? optionId,
    }));
  }, [generation.lookback]);

  const connectorOptions = useMemo(
    () => [
      { value: DEFAULT_CONNECTOR_VALUE, inputDisplay: i18n.GENERATION_CONNECTOR_DEFAULT },
      ...connectors.map((connector) => ({ value: connector.id, inputDisplay: connector.name })),
    ],
    [connectors]
  );

  return (
    <SettingsSection
      title={i18n.GENERATION_SECTION_TITLE}
      subtitle={i18n.GENERATION_SECTION_SUBTITLE}
      data-test-subj="pndWatchGenerationSection"
    >
      <EuiFormRow label={i18n.ALERT_SIZE_LABEL} helpText={i18n.ALERT_SIZE_HELP} fullWidth>
        <EuiFieldNumber
          min={1}
          max={500}
          value={generation.alertSize}
          onChange={(event) => onAlertSizeChange(Number(event.target.value))}
          aria-label={i18n.ALERT_SIZE_LABEL}
          data-test-subj="pndWatchGenerationAlertSize"
          fullWidth
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow label={i18n.LOOKBACK_LABEL} helpText={i18n.LOOKBACK_HELP} fullWidth>
        <EuiSelect
          value={generation.lookback}
          options={lookbackOptions}
          onChange={(event) => onLookbackChange(event.target.value)}
          aria-label={i18n.LOOKBACK_LABEL}
          data-test-subj="pndWatchGenerationLookbackSelect"
          fullWidth
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.GENERATION_CONNECTOR_LABEL}
        helpText={i18n.GENERATION_CONNECTOR_HELP}
        fullWidth
      >
        <EuiSuperSelect
          valueOfSelected={generation.connectorId}
          options={connectorOptions}
          onChange={onConnectorChange}
          isLoading={isLoading}
          aria-label={i18n.GENERATION_CONNECTOR_LABEL}
          data-test-subj="pndWatchGenerationConnectorSelect"
          fullWidth
        />
      </EuiFormRow>
    </SettingsSection>
  );
};
