/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelect,
  EuiSelectable,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GraphPrototypeVersion } from './graph_prototype_version';
import {
  DEFAULT_GRAPH_PROTOTYPE_VERSION,
  GRAPH_PROTOTYPE_VERSIONS,
} from './graph_prototype_version';
import { PREFIX } from '../test_ids';

export const GRAPH_PROTOTYPE_VERSION_SELECTOR_TEST_ID =
  `${PREFIX}GraphPrototypeVersionSelector` as const;

const LABEL = i18n.translate('xpack.securitySolution.flyout.graphPrototypeVersionSelector.label', {
  defaultMessage: 'Prototype version:',
});

const POPOVER_WIDTH = 140;

export interface GraphPrototypeVersionSelectorProps {
  value?: GraphPrototypeVersion;
  onChange?: (version: GraphPrototypeVersion) => void;
}

export const GraphPrototypeVersionSelector = memo<GraphPrototypeVersionSelectorProps>(
  ({ value = DEFAULT_GRAPH_PROTOTYPE_VERSION, onChange }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const selectId = useGeneratedHtmlId({ prefix: 'graphPrototypeVersion' });

    const options: Array<EuiSelectableOption<{ value: GraphPrototypeVersion }>> = useMemo(
      () =>
        GRAPH_PROTOTYPE_VERSIONS.map((version) => ({
          key: version.value,
          label: version.text,
          value: version.value,
          checked: version.value === value ? 'on' : undefined,
        })),
      [value]
    );

    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const handleTriggerMouseDown = useCallback((event: React.MouseEvent<HTMLSelectElement>) => {
      event.preventDefault();
      setIsPopoverOpen((open) => !open);
    }, []);

    const handleTriggerKeyDown = useCallback((event: React.KeyboardEvent<HTMLSelectElement>) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsPopoverOpen(true);
      }
    }, []);

    const handleChange = useCallback(
      (newOptions: Array<EuiSelectableOption<{ value: GraphPrototypeVersion }>>) => {
        const selected = newOptions.find((option) => option.checked === 'on');
        if (selected?.value) {
          onChange?.(selected.value);
        }
        setIsPopoverOpen(false);
      },
      [onChange]
    );

    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj={GRAPH_PROTOTYPE_VERSION_SELECTOR_TEST_ID}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <label htmlFor={selectId}>{LABEL}</label>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiSelect
                id={selectId}
                compressed
                options={[...GRAPH_PROTOTYPE_VERSIONS]}
                value={value}
                aria-label={LABEL}
                onMouseDown={handleTriggerMouseDown}
                onKeyDown={handleTriggerKeyDown}
                onChange={() => undefined}
              />
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiSelectable<{ value: GraphPrototypeVersion }>
              aria-label={LABEL}
              options={options}
              onChange={handleChange}
              singleSelection
              listProps={{ onFocusBadge: false }}
            >
              {(list) => <div css={{ width: POPOVER_WIDTH }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

GraphPrototypeVersionSelector.displayName = 'GraphPrototypeVersionSelector';
