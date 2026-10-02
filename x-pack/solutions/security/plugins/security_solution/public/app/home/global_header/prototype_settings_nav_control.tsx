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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  FACELIFT_VERSION_OPTIONS,
  useActiveFaceliftVersion,
  type FaceliftVersion,
} from '../../../entity_analytics/components/home/facelift/active_version';
import {
  METRICS_VERSION_OPTIONS as METRICS_VERSION_OPTIONS_V6,
  useActiveMetricsVersion as useActiveMetricsVersionV6,
} from '../../../entity_analytics/components/home/facelift/active_metrics_version';
import {
  METRICS_VERSION_OPTIONS as METRICS_VERSION_OPTIONS_V7,
  useActiveMetricsVersion as useActiveMetricsVersionV7,
} from '../../../entity_analytics/components/home/facelift/v7/active_metrics_version';
import {
  METRICS_VERSION_OPTIONS as METRICS_VERSION_OPTIONS_V8,
  useActiveMetricsVersion as useActiveMetricsVersionV8,
  useSimplifiedMetrics,
} from '../../../entity_analytics/components/home/facelift/v8/active_metrics_version';

const ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.globalHeader.prototypeSettingsAriaLabel',
  { defaultMessage: 'Prototype settings' }
);

const PROTOTYPE_VERSION_ITEM = i18n.translate(
  'xpack.securitySolution.globalHeader.prototypeSettingsPrototypeVersion',
  { defaultMessage: 'Prototype version' }
);

const METRICS_VERSION_ITEM = i18n.translate(
  'xpack.securitySolution.globalHeader.prototypeSettingsMetricsVersion',
  { defaultMessage: 'Metrics version' }
);

const SIMPLIFIED_METRICS_ITEM = i18n.translate(
  'xpack.securitySolution.globalHeader.faceliftSimplifiedMetricsLabel',
  { defaultMessage: 'Simplified metrics' }
);

const ROOT_PANEL_ID = 0;
const PROTOTYPE_PANEL_ID = 1;
const METRICS_PANEL_ID = 2;

const showsMetricsVersion = (version: FaceliftVersion): boolean =>
  version === 'v6' || version === 'v7' || version === 'v8';

/**
 * Empty chrome-header button (palette) whose context menu holds Prototype version,
 * Metrics version, and the Simplified metrics switch — each only when the
 * current prototype makes that control valid.
 */
export const PrototypeSettingsNavControl: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [faceliftVersion, setFaceliftVersion] = useActiveFaceliftVersion();
  const [metricsVersionV6, setMetricsVersionV6] = useActiveMetricsVersionV6();
  const [metricsVersionV7, setMetricsVersionV7] = useActiveMetricsVersionV7();
  const [metricsVersionV8, setMetricsVersionV8] = useActiveMetricsVersionV8();
  const [simplified, setSimplified] = useSimplifiedMetrics();

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const showMetrics = showsMetricsVersion(faceliftVersion);
  const showSwitcher = faceliftVersion === 'v8';

  const metricsOptions =
    faceliftVersion === 'v8'
      ? METRICS_VERSION_OPTIONS_V8
      : faceliftVersion === 'v7'
      ? METRICS_VERSION_OPTIONS_V7
      : METRICS_VERSION_OPTIONS_V6;

  const metricsValue =
    faceliftVersion === 'v8'
      ? metricsVersionV8
      : faceliftVersion === 'v7'
      ? metricsVersionV7
      : metricsVersionV6;

  const onMetricsChange = useCallback(
    (key: string) => {
      if (faceliftVersion === 'v8') {
        setMetricsVersionV8(key as typeof metricsVersionV8);
      } else if (faceliftVersion === 'v7') {
        setMetricsVersionV7(key as typeof metricsVersionV7);
      } else {
        setMetricsVersionV6(key as typeof metricsVersionV6);
      }
      setIsOpen(false);
    },
    [faceliftVersion, setMetricsVersionV6, setMetricsVersionV7, setMetricsVersionV8]
  );

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
    const rootItems: EuiContextMenuPanelDescriptor['items'] = [
      {
        name: PROTOTYPE_VERSION_ITEM,
        panel: PROTOTYPE_PANEL_ID,
        'data-test-subj': 'eaPrototypeSettingsPrototypeVersion',
      },
    ];

    if (showMetrics) {
      rootItems.push({
        name: METRICS_VERSION_ITEM,
        panel: METRICS_PANEL_ID,
        'data-test-subj': 'eaPrototypeSettingsMetricsVersion',
      });
    }

    if (showSwitcher) {
      rootItems.push({
        name: (
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>{SIMPLIFIED_METRICS_ITEM}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                compressed
                label={SIMPLIFIED_METRICS_ITEM}
                showLabel={false}
                checked={simplified}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setSimplified(event.target.checked)}
                data-test-subj="eaFaceliftSimplifiedMetricsSwitch"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        onClick: (event) => {
          event.preventDefault();
          setSimplified(!simplified);
        },
        'data-test-subj': 'eaPrototypeSettingsSimplifiedMetrics',
      });
    }

    const nextPanels: EuiContextMenuPanelDescriptor[] = [
      {
        id: ROOT_PANEL_ID,
        title: ARIA_LABEL,
        items: rootItems,
      },
      {
        id: PROTOTYPE_PANEL_ID,
        title: PROTOTYPE_VERSION_ITEM,
        items: FACELIFT_VERSION_OPTIONS.map((option) => ({
          name: option.label,
          icon: option.key === faceliftVersion ? 'check' : 'empty',
          onClick: () => {
            setFaceliftVersion(option.key);
            setIsOpen(false);
          },
          'data-test-subj': `eaPrototypeSettingsPrototypeOption-${option.key}`,
        })),
      },
    ];

    if (showMetrics) {
      nextPanels.push({
        id: METRICS_PANEL_ID,
        title: METRICS_VERSION_ITEM,
        items: metricsOptions.map((option) => ({
          name: option.label,
          icon: option.key === metricsValue ? 'check' : 'empty',
          onClick: () => onMetricsChange(option.key),
          'data-test-subj': `eaPrototypeSettingsMetricsOption-${option.key}`,
        })),
      });
    }

    return nextPanels;
  }, [
    faceliftVersion,
    metricsOptions,
    metricsValue,
    onMetricsChange,
    setFaceliftVersion,
    setSimplified,
    showMetrics,
    showSwitcher,
    simplified,
  ]);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="palette"
          display="base"
          color="accent"
          size="s"
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={ARIA_LABEL}
          onClick={togglePopover}
          data-test-subj="eaPrototypeSettingsButton"
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      repositionOnScroll
    >
      <EuiContextMenu
        initialPanelId={ROOT_PANEL_ID}
        panels={panels}
        size="s"
        data-test-subj="eaPrototypeSettingsMenu"
      />
    </EuiPopover>
  );
};
