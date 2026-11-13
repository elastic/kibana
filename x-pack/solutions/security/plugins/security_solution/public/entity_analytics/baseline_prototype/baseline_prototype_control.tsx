/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  setBaselineDataMode,
  setBaselineVersion,
  setJudgementAvailable,
  useBaselineDataMode,
  useBaselineVersion,
  useJudgementAvailable,
} from './baseline_prototype_state';
import type { BaselineDataMode, BaselineVersion } from './baseline_prototype_state';

const SETTINGS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.settingsLabel',
  { defaultMessage: 'Prototype settings' }
);
const VERSION_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.versionLabel',
  { defaultMessage: 'Baseline version' }
);
const DATA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.dataLabel',
  { defaultMessage: 'Typical score data' }
);
const MODEL_UNAVAILABLE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.modelUnavailableLabel',
  { defaultMessage: 'Simulate model unavailable' }
);

const VERSION_NAMES: Record<BaselineVersion, string> = {
  v0: i18n.translate('xpack.securitySolution.entityAnalytics.baselinePrototype.versionV0', {
    defaultMessage: 'v.0',
  }),
  off: i18n.translate('xpack.securitySolution.entityAnalytics.baselinePrototype.versionOff', {
    defaultMessage: 'Off (current page)',
  }),
};

const DATA_MODE_NAMES: Record<BaselineDataMode, string> = {
  live: i18n.translate('xpack.securitySolution.entityAnalytics.baselinePrototype.dataLive', {
    defaultMessage: 'Live (ES|QL)',
  }),
  mock: i18n.translate('xpack.securitySolution.entityAnalytics.baselinePrototype.dataMock', {
    defaultMessage: 'Mock',
  }),
};

const ROOT_PANEL_ID = 0;
const VERSION_PANEL_ID = 1;
const DATA_PANEL_ID = 2;

const VERSION_OPTIONS: readonly BaselineVersion[] = ['v0', 'off'];
const DATA_MODE_OPTIONS: readonly BaselineDataMode[] = ['live', 'mock'];

/**
 * DESIGN PROTOTYPE, NOT FOR MERGE.
 * A rocket button in the chrome header. Its menu switches the baseline prototype on and off,
 * picks live or mock typical scores, and simulates the decision model being unavailable.
 */
export const BaselinePrototypeControl: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const version = useBaselineVersion();
  const dataMode = useBaselineDataMode();
  const judgementAvailable = useJudgementAvailable();

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
    const rootItems: EuiContextMenuPanelDescriptor['items'] = [
      {
        name: VERSION_LABEL,
        panel: VERSION_PANEL_ID,
        'data-test-subj': 'eaBaselinePrototypeVersion',
      },
    ];

    if (version !== 'off') {
      rootItems.push(
        {
          name: DATA_LABEL,
          panel: DATA_PANEL_ID,
          'data-test-subj': 'eaBaselinePrototypeData',
        },
        {
          name: (
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem>{MODEL_UNAVAILABLE_LABEL}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  compressed
                  label={MODEL_UNAVAILABLE_LABEL}
                  showLabel={false}
                  checked={!judgementAvailable}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setJudgementAvailable(!event.target.checked)}
                  data-test-subj="eaBaselinePrototypeModelUnavailableSwitch"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          onClick: (event) => {
            event.preventDefault();
            setJudgementAvailable(!judgementAvailable);
          },
          'data-test-subj': 'eaBaselinePrototypeModelUnavailable',
        }
      );
    }

    return [
      { id: ROOT_PANEL_ID, title: SETTINGS_LABEL, items: rootItems },
      {
        id: VERSION_PANEL_ID,
        title: VERSION_LABEL,
        items: VERSION_OPTIONS.map((option) => ({
          name: VERSION_NAMES[option],
          icon: option === version ? 'check' : 'empty',
          onClick: () => {
            setBaselineVersion(option);
            setIsOpen(false);
          },
          'data-test-subj': `eaBaselinePrototypeVersionOption-${option}`,
        })),
      },
      {
        id: DATA_PANEL_ID,
        title: DATA_LABEL,
        items: DATA_MODE_OPTIONS.map((option) => ({
          name: DATA_MODE_NAMES[option],
          icon: option === dataMode ? 'check' : 'empty',
          onClick: () => {
            setBaselineDataMode(option);
            setIsOpen(false);
          },
          'data-test-subj': `eaBaselinePrototypeDataOption-${option}`,
        })),
      },
    ];
  }, [dataMode, judgementAvailable, version]);

  return (
    <EuiPopover
      button={
        <EuiToolTip content={SETTINGS_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="rocket"
            display={version === 'off' ? 'empty' : 'base'}
            color="accent"
            size="s"
            aria-label={SETTINGS_LABEL}
            onClick={togglePopover}
            data-test-subj="eaBaselinePrototypeButton"
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={SETTINGS_LABEL}
    >
      <EuiContextMenu initialPanelId={ROOT_PANEL_ID} panels={panels} />
    </EuiPopover>
  );
};
