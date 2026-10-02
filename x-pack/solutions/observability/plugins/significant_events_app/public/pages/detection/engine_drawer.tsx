/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { EngineActivityPanel } from './engine_activity_panel';
import { StreamsControls } from './streams_controls';

export type EngineDrawerTab = 'activity' | 'streams';
export const engineDrawerLabels = {
  title: i18n.translate('xpack.significantEventsApp.engineDrawer.title', {
    defaultMessage: 'Engine',
  }),
  scope: i18n.translate('xpack.significantEventsApp.engineDrawer.scope', {
    defaultMessage: 'System-wide activity and watched streams',
  }),
  activity: i18n.translate('xpack.significantEventsApp.engineDrawer.activity', {
    defaultMessage: 'Activity',
  }),
  streams: i18n.translate('xpack.significantEventsApp.engineDrawer.streams', {
    defaultMessage: 'Watched streams',
  }),
};

export const EngineDrawer = ({
  tab,
  onSelectTab,
  onClose,
}: {
  tab: EngineDrawerTab;
  onSelectTab: (tab: EngineDrawerTab) => void;
  onClose: () => void;
}): React.ReactElement => {
  const id = useGeneratedHtmlId({ prefix: 'detectionEngineDrawer' });
  return (
    <EuiFlyout
      size="l"
      maxWidth={960}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      data-test-subj="detectionEngineDrawer"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={`${id}-title`}>{engineDrawerLabels.title}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {engineDrawerLabels.scope}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabs size="s">
          {(['activity', 'streams'] as const).map((item) => (
            <EuiTab
              key={item}
              id={`${id}-${item}-tab`}
              isSelected={tab === item}
              aria-controls={`${id}-${item}-panel`}
              onClick={() => onSelectTab(item)}
              data-test-subj={`detectionEngineDrawer-${item}`}
            >
              {engineDrawerLabels[item]}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <section
          id={`${id}-activity-panel`}
          aria-labelledby={`${id}-activity-tab`}
          role="tabpanel"
          hidden={tab !== 'activity'}
          css={css`
            display: ${tab === 'activity' ? 'block' : 'none'};
          `}
        >
          <EngineActivityPanel expanded />
        </section>
        <section
          id={`${id}-streams-panel`}
          aria-labelledby={`${id}-streams-tab`}
          role="tabpanel"
          hidden={tab !== 'streams'}
          css={css`
            display: ${tab === 'streams' ? 'block' : 'none'};
          `}
        >
          <StreamsControls />
        </section>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
