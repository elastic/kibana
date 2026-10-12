/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  useEuiTheme,
  type EuiSelectableOption,
} from '@elastic/eui';
import type { SlackTriggerKind, TriggerFormValues } from '../automation_form_values';
import { triggerLabels } from './translations';
import { slackTriggerLabels, triggerTypeLabels } from '../../../utils/trigger_display';

export const TriggerPicker = ({
  button,
  current,
  onSelect,
}: {
  button: (toggle: () => void) => React.ReactElement;
  current?: TriggerFormValues['kind'];
  onSelect: (kind: TriggerFormValues['kind']) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const groupLabelCss = { paddingInline: euiTheme.size.s };
  const options: Array<EuiSelectableOption<{ kind?: TriggerFormValues['kind'] }>> = [
    { label: triggerLabels.elastic, isGroupLabel: true, css: groupLabelCss },
    {
      label: triggerTypeLabels.alertTriggered,
      kind: 'alert',
      prepend: <EuiIcon type="logoElastic" aria-hidden={true} />,
    },
    { label: triggerLabels.slack, isGroupLabel: true, css: groupLabelCss },
    ...(Object.keys(slackTriggerLabels) as SlackTriggerKind[]).map((kind) => ({
      label: slackTriggerLabels[kind],
      kind,
      prepend: <EuiIcon type="logoSlack" aria-hidden={true} />,
    })),
    { label: triggerTypeLabels.scheduled, isGroupLabel: true, css: groupLabelCss },
    {
      label: triggerLabels.every,
      kind: 'every',
      prepend: <EuiIcon type="calendar" aria-hidden={true} />,
    },
    {
      label: triggerLabels.customCron,
      kind: 'cron',
      prepend: <EuiIcon type="clock" aria-hidden={true} />,
    },
  ].map((option) => ({
    ...option,
    checked: 'kind' in option && option.kind === current ? 'on' : undefined,
  })) as Array<EuiSelectableOption<{ kind?: TriggerFormValues['kind'] }>>;

  return (
    <EuiPopover
      aria-label={triggerLabels.addTrigger}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={button(() => setIsOpen((open) => !open))}
    >
      <EuiSelectable
        aria-label={triggerLabels.addTrigger}
        searchable
        singleSelection
        searchProps={{ placeholder: triggerLabels.searchTriggers, compressed: true }}
        noMatchesMessage={triggerLabels.noTriggers}
        options={options}
        onChange={(_options, _event, changed) => {
          if (changed.kind) onSelect(changed.kind);
          setIsOpen(false);
        }}
        listProps={{ bordered: false, showIcons: false, paddingSize: 's', isVirtualized: false }}
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
