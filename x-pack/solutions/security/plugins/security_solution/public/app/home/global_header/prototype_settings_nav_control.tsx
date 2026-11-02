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
  useSimplifiedMetrics as useSimplifiedMetricsV8,
} from '../../../entity_analytics/components/home/facelift/v8/active_metrics_version';
import { useSimplifiedMetrics as useSimplifiedMetricsV9 } from '../../../entity_analytics/components/home/facelift/v9/active_metrics_version';
import {
  EMPTY_STATE_OPTIONS,
  ERROR_STATE_OPTIONS,
  LOADING_STATE_OPTIONS,
  usePrototypeStates,
  type PrototypeStateGroup,
  type PrototypeStates,
  type StateOption,
} from '../../../entity_analytics/components/home/facelift/v9_1/prototype_states';

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

const EMPTY_STATES_ITEM = i18n.translate(
  'xpack.securitySolution.globalHeader.prototypeSettingsEmptyStates',
  { defaultMessage: 'Empty states' }
);

const LOADING_STATES_ITEM = i18n.translate(
  'xpack.securitySolution.globalHeader.prototypeSettingsLoadingStates',
  { defaultMessage: 'Loading states' }
);

const ERROR_STATES_ITEM = i18n.translate(
  'xpack.securitySolution.globalHeader.prototypeSettingsErrorStates',
  { defaultMessage: 'Error states' }
);

const PROPOSED_DESIGN_ITEM = i18n.translate(
  'xpack.securitySolution.globalHeader.prototypeSettingsProposedDesign',
  { defaultMessage: 'Proposed design' }
);

const ROOT_PANEL_ID = 0;
const PROTOTYPE_PANEL_ID = 1;
const METRICS_PANEL_ID = 2;
const EMPTY_STATES_PANEL_ID = 3;
const LOADING_STATES_PANEL_ID = 4;
const ERROR_STATES_PANEL_ID = 5;

const UI_STATES_MENUS: Array<{
  group: PrototypeStateGroup;
  panelId: number;
  name: string;
  testId: string;
  options: Array<StateOption<string>>;
}> = [
  {
    group: 'empty',
    panelId: EMPTY_STATES_PANEL_ID,
    name: EMPTY_STATES_ITEM,
    testId: 'EmptyStates',
    options: EMPTY_STATE_OPTIONS,
  },
  {
    group: 'loading',
    panelId: LOADING_STATES_PANEL_ID,
    name: LOADING_STATES_ITEM,
    testId: 'LoadingStates',
    options: LOADING_STATE_OPTIONS,
  },
  {
    group: 'error',
    panelId: ERROR_STATES_PANEL_ID,
    name: ERROR_STATES_ITEM,
    testId: 'ErrorStates',
    options: ERROR_STATE_OPTIONS,
  },
];

const showsMetricsVersion = (version: FaceliftVersion): boolean =>
  version === 'v6' || version === 'v7' || version === 'v8';

/**
 * Empty chrome-header button (palette) whose context menu holds Prototype version,
 * Metrics version, the Simplified metrics switch, and (v.9.1) the Empty / Loading /
 * Error states submenus — each only when the current prototype makes that control
 * valid.
 */
export const PrototypeSettingsNavControl: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [faceliftVersion, setFaceliftVersion] = useActiveFaceliftVersion();
  const [metricsVersionV6, setMetricsVersionV6] = useActiveMetricsVersionV6();
  const [metricsVersionV7, setMetricsVersionV7] = useActiveMetricsVersionV7();
  const [metricsVersionV8, setMetricsVersionV8] = useActiveMetricsVersionV8();
  const [simplifiedV8, setSimplifiedV8] = useSimplifiedMetricsV8();
  const [simplifiedV9, setSimplifiedV9] = useSimplifiedMetricsV9();
  const [uiStates, updateUiStates] = usePrototypeStates();

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const showMetrics = showsMetricsVersion(faceliftVersion);
  const showSwitcher = faceliftVersion === 'v8' || faceliftVersion === 'v9';
  const showUiStates = faceliftVersion === 'v9_1';
  const simplified = faceliftVersion === 'v9' ? simplifiedV9 : simplifiedV8;
  const setSimplified = faceliftVersion === 'v9' ? setSimplifiedV9 : setSimplifiedV8;

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

    if (showUiStates) {
      UI_STATES_MENUS.forEach((menu) => {
        rootItems.push({
          name: menu.name,
          panel: menu.panelId,
          'data-test-subj': `eaPrototypeSettings${menu.testId}`,
        });
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

    if (showUiStates) {
      UI_STATES_MENUS.forEach((menu) => {
        const proposed = uiStates.variants[menu.group] === 'proposed';
        const toggleVariant = () =>
          updateUiStates({
            variants: { ...uiStates.variants, [menu.group]: proposed ? 'today' : 'proposed' },
          });

        nextPanels.push({
          id: menu.panelId,
          title: menu.name,
          items: [
            {
              name: (
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem>{PROPOSED_DESIGN_ITEM}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      compressed
                      label={PROPOSED_DESIGN_ITEM}
                      showLabel={false}
                      checked={proposed}
                      onChange={(event) => {
                        event.stopPropagation();
                        toggleVariant();
                      }}
                      data-test-subj={`eaPrototypeSettings${menu.testId}ProposedSwitch`}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
              onClick: (event) => {
                event.preventDefault();
                toggleVariant();
              },
              'data-test-subj': `eaPrototypeSettings${menu.testId}Proposed`,
            },
            { isSeparator: true, key: `${menu.testId}Separator` },
            ...menu.options.map((option) => ({
              name: option.label,
              icon: option.key === uiStates[menu.group] ? 'check' : 'empty',
              onClick: () =>
                updateUiStates({ [menu.group]: option.key } as Partial<PrototypeStates>),
              'data-test-subj': `eaPrototypeSettings${menu.testId}Option-${option.key}`,
            })),
          ],
        });
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
    showUiStates,
    simplified,
    uiStates,
    updateUiStates,
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
