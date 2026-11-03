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

/**
 * Chrome-header button (palette) whose context menu holds the prototype's
 * simulated metric-tile states: Empty / Loading / Error, each with a Today /
 * Proposed design switch.
 */
export const PrototypeSettingsNavControl: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [uiStates, updateUiStates] = usePrototypeStates();

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
    const rootItems: EuiContextMenuPanelDescriptor['items'] = UI_STATES_MENUS.map((menu) => ({
      name: menu.name,
      panel: menu.panelId,
      'data-test-subj': `eaPrototypeSettings${menu.testId}`,
    }));

    const nextPanels: EuiContextMenuPanelDescriptor[] = [
      {
        id: ROOT_PANEL_ID,
        title: ARIA_LABEL,
        items: rootItems,
      },
    ];

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

    return nextPanels;
  }, [uiStates, updateUiStates]);

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
