/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  type IdleBuilderPresentation,
  useMixedCreatePrototypeSettings,
} from './mixed_create_prototype_settings';

const IDLE_BUILDER_PRESENTATION_OPTIONS: Array<{
  id: IdleBuilderPresentation;
  label: string;
}> = [
  {
    id: 'panel',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.prototypeBuilderPanel', {
      defaultMessage: 'Panel',
    }),
  },
  {
    id: 'badge',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.prototypeBuilderBadge', {
      defaultMessage: 'Badge',
    }),
  },
];

type OpenListener = () => void;

let openListener: OpenListener | undefined;

/** Opens the Create rule prototype settings modal (user-menu entry point). */
export const openMixedCreatePrototypeSettingsModal = (): void => {
  openListener?.();
};

export const MixedCreatePrototypeSettingsModalHost = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, setCompactAskAnything, setIdleBuilderPresentation } =
    useMixedCreatePrototypeSettings();

  useEffect(() => {
    openListener = () => setIsOpen(true);
    return () => {
      openListener = undefined;
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal
      onClose={() => setIsOpen(false)}
      maxWidth={420}
      data-test-subj="mixedRulesPrototypeSettings"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.observabilityAlerting.mixedCreate.prototypeSettingsTitle"
            defaultMessage="Create rule prototype"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          display="columnCompressedSwitch"
          label={
            <FormattedMessage
              id="xpack.observabilityAlerting.mixedCreate.prototypeCompactAskAnythingLabel"
              defaultMessage="Compact growing input"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.observabilityAlerting.mixedCreate.prototypeCompactAskAnythingHelp"
              defaultMessage="Starts small and grows smoothly as you type. Off = fixed 3-line field."
            />
          }
        >
          <EuiSwitch
            compressed
            label={
              settings.compactAskAnything ? (
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.prototypeCompactOn"
                  defaultMessage="On"
                />
              ) : (
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.prototypeCompactOff"
                  defaultMessage="Off"
                />
              )
            }
            checked={settings.compactAskAnything}
            onChange={(event) => setCompactAskAnything(event.target.checked)}
            data-test-subj="mixedRulesPrototypeCompactAskAnything"
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.observabilityAlerting.mixedCreate.prototypeBuilderPresentationLabel"
              defaultMessage="Builder starters"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.observabilityAlerting.mixedCreate.prototypeBuilderPresentationHelp"
              defaultMessage="Panel = bordered options (default). Badge = chips."
            />
          }
        >
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.observabilityAlerting.mixedCreate.prototypeBuilderPresentationLegend',
              { defaultMessage: 'Builder starter presentation' }
            )}
            options={IDLE_BUILDER_PRESENTATION_OPTIONS}
            idSelected={settings.idleBuilderPresentation}
            onChange={(id) => setIdleBuilderPresentation(id as IdleBuilderPresentation)}
            buttonSize="compressed"
            isFullWidth
            data-test-subj="mixedRulesPrototypeBuilderPresentation"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          onClick={() => setIsOpen(false)}
          fill
          data-test-subj="mixedRulesPrototypeSettingsClose"
        >
          <FormattedMessage
            id="xpack.observabilityAlerting.mixedCreate.prototypeSettingsClose"
            defaultMessage="Close"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
