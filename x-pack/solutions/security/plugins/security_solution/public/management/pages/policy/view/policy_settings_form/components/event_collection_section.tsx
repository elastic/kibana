/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { i18n } from '@kbn/i18n';
import type { EuiSwitchProps } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSwitch,
  useEuiTheme,
} from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { PolicyOperatingSystem } from '../../../../../../../common/endpoint/types';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { PolicyFormComponentCommonProps } from '../types';
import { SettingCard } from './setting_card';
import { EVENT_COLLECTION_POLICY_SECTION_DESCRIPTION } from './policy_setting_section_descriptions';
import { OsProtectionRow } from './os_protection_row';
import { WINDOWS_EVENT_COLLECTION_OPTIONS } from './cards/windows_event_collection_card';
import { MAC_EVENT_COLLECTION_OPTIONS } from './cards/mac_event_collection_card';
import {
  applyLinuxSessionDataClearsTty,
  getLinuxEventCollectionCheckboxOptions,
  getLinuxSupplementalOptionsForMode,
} from './cards/linux_event_collection_options';
import { EventCheckbox } from './event_collection_card';

const mapOperatingSystemToPolicyOsKey = {
  [OperatingSystem.WINDOWS]: PolicyOperatingSystem.windows,
  [OperatingSystem.LINUX]: PolicyOperatingSystem.linux,
  [OperatingSystem.MAC]: PolicyOperatingSystem.mac,
} as const;

export type EventCollectionSectionProps = PolicyFormComponentCommonProps;

export const EventCollectionSection = memo<EventCollectionSectionProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isEditMode = mode === 'edit';
    const { euiTheme } = useEuiTheme();

    const isLinuxDnsEnabled = useIsExperimentalFeatureEnabled('linuxDnsEvents');

    const linuxCheckboxOptions = useMemo(
      () => getLinuxEventCollectionCheckboxOptions(isLinuxDnsEnabled),
      [isLinuxDnsEnabled]
    );

    const linuxSupplemental = useMemo(() => getLinuxSupplementalOptionsForMode(mode), [mode]);

    const onChangeWithLinuxSideEffects = useCallback<PolicyFormComponentCommonProps['onChange']>(
      (args) => {
        if (args.isValid) {
          applyLinuxSessionDataClearsTty(args.updatedPolicy);
        }
        onChange(args);
      },
      [onChange]
    );

    const sectionSelected = useMemo(() => {
      const winAny = WINDOWS_EVENT_COLLECTION_OPTIONS.some(
        ({ protectionField }) => policy.windows.events[protectionField]
      );
      const macAny = MAC_EVENT_COLLECTION_OPTIONS.some(
        ({ protectionField }) => policy.mac.events[protectionField]
      );
      const linuxMainAny = linuxCheckboxOptions.some(
        ({ protectionField }) => policy.linux.events[protectionField]
      );
      return (
        winAny ||
        macAny ||
        linuxMainAny ||
        policy.linux.events.session_data ||
        policy.linux.events.tty_io
      );
    }, [policy, linuxCheckboxOptions]);

    const sessionSupplemental = linuxSupplemental[0];
    const ttySupplemental = linuxSupplemental[1];

    const sessionKeyPath = 'linux.events.session_data';
    const sessionChecked = policy.linux.events.session_data;
    const sessionSwitchDisabled =
      !isEditMode ||
      (sessionSupplemental.isDisabled ? sessionSupplemental.isDisabled(policy) : false);

    const savedLinuxTtyIoWhenSessionWasOnRef = useRef<boolean | undefined>(undefined);

    const onSessionSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (ev) => {
        const updatedPolicy = cloneDeep(policy);
        if (!ev.target.checked) {
          savedLinuxTtyIoWhenSessionWasOnRef.current = updatedPolicy.linux.events.tty_io;
        }
        set(updatedPolicy, sessionKeyPath, ev.target.checked);
        applyLinuxSessionDataClearsTty(updatedPolicy);
        if (ev.target.checked && savedLinuxTtyIoWhenSessionWasOnRef.current !== undefined) {
          updatedPolicy.linux.events.tty_io = savedLinuxTtyIoWhenSessionWasOnRef.current;
        }
        onChangeWithLinuxSideEffects({ isValid: true, updatedPolicy });
      },
      [onChangeWithLinuxSideEffects, policy]
    );

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.eventCollection', {
          defaultMessage: 'Event collection',
        })}
        supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX]}
        sectionDescription={EVENT_COLLECTION_POLICY_SECTION_DESCRIPTION}
        mode={mode}
        selected={sectionSelected}
        dataTestSubj={getTestId()}
      >
        <OsProtectionRow
          os={OperatingSystem.WINDOWS}
          osLabelBold
          data-test-subj={getTestId('windowsRow')}
        >
          <EuiFlexGroup
            wrap
            responsive={false}
            gutterSize="m"
            alignItems="center"
            data-test-subj={getTestId('windows-options')}
          >
            {WINDOWS_EVENT_COLLECTION_OPTIONS.map(({ name, protectionField }) => {
              const keyPath = `${
                mapOperatingSystemToPolicyOsKey[OperatingSystem.WINDOWS]
              }.events.${String(protectionField)}`;
              return (
                <EuiFlexItem key={keyPath} grow={false}>
                  <EventCheckbox
                    label={name}
                    keyPath={keyPath}
                    policy={policy}
                    onChange={onChange}
                    disabled={!isEditMode}
                    data-test-subj={getTestId(`windows-${String(protectionField)}`)}
                  />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </OsProtectionRow>

        <OsProtectionRow os={OperatingSystem.MAC} osLabelBold data-test-subj={getTestId('macRow')}>
          <EuiFlexGroup
            wrap
            responsive={false}
            gutterSize="m"
            alignItems="center"
            data-test-subj={getTestId('mac-options')}
          >
            {MAC_EVENT_COLLECTION_OPTIONS.map(({ name, protectionField }) => {
              const keyPath = `${
                mapOperatingSystemToPolicyOsKey[OperatingSystem.MAC]
              }.events.${String(protectionField)}`;
              return (
                <EuiFlexItem key={keyPath} grow={false}>
                  <EventCheckbox
                    label={name}
                    keyPath={keyPath}
                    policy={policy}
                    onChange={onChange}
                    disabled={!isEditMode}
                    data-test-subj={getTestId(`mac-${String(protectionField)}`)}
                  />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </OsProtectionRow>

        <OsProtectionRow
          os={OperatingSystem.LINUX}
          osLabelBold
          isLast
          data-test-subj={getTestId('linuxRow')}
        >
          <EuiFlexGroup direction="column" gutterSize="m" responsive={false} alignItems="flexStart">
            <EuiFlexGroup
              wrap
              responsive={false}
              gutterSize="m"
              alignItems="center"
              data-test-subj={getTestId('linux-options')}
            >
              {linuxCheckboxOptions.map(({ name, protectionField }) => {
                const keyPath = `${
                  mapOperatingSystemToPolicyOsKey[OperatingSystem.LINUX]
                }.events.${String(protectionField)}`;
                return (
                  <EuiFlexItem key={keyPath} grow={false}>
                    <EventCheckbox
                      label={name}
                      keyPath={keyPath}
                      policy={policy}
                      onChange={onChangeWithLinuxSideEffects}
                      disabled={!isEditMode}
                      data-test-subj={getTestId(`linux-${String(protectionField)}`)}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>

            <EuiPanel
              hasBorder={false}
              hasShadow={false}
              paddingSize="none"
              color="subdued"
              css={css`
                border: 1px solid ${euiTheme.colors.borderBaseSubdued};
                border-radius: ${euiTheme.border.radius.medium};
                padding-block: ${euiTheme.size.s};
                padding-inline: ${euiTheme.size.m};
              `}
              data-test-subj={getTestId('linux-supplemental')}
            >
              <EuiFlexGroup
                responsive={false}
                alignItems="center"
                wrap={false}
                gutterSize="none"
                css={{ gap: euiTheme.size.l }}
              >
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        showLabel={true}
                        label={sessionSupplemental.name}
                        checked={sessionChecked}
                        onChange={onSessionSwitchChange}
                        disabled={sessionSwitchDisabled}
                        compressed
                        data-test-subj={getTestId('linux-session_data')}
                      />
                    </EuiFlexItem>
                    {sessionSupplemental.description ? (
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          type="question"
                          content={sessionSupplemental.description}
                          anchorProps={{
                            'data-test-subj': getTestId('linux-session_dataTooltipIcon'),
                          }}
                        />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow={false} data-test-subj={getTestId('tty_ioContainer')}>
                  <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EventCheckbox
                        label={ttySupplemental.name}
                        keyPath={`${
                          mapOperatingSystemToPolicyOsKey[OperatingSystem.LINUX]
                        }.events.${String(ttySupplemental.protectionField)}`}
                        policy={policy}
                        onChange={onChangeWithLinuxSideEffects}
                        disabled={
                          !isEditMode ||
                          (ttySupplemental.isDisabled ? ttySupplemental.isDisabled(policy) : false)
                        }
                        data-test-subj={getTestId('linux-tty_io')}
                      />
                    </EuiFlexItem>
                    {ttySupplemental.tooltipText ? (
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          position="right"
                          content={ttySupplemental.tooltipText}
                          anchorProps={{
                            'data-test-subj': getTestId('linux-tty_ioTooltipIcon'),
                          }}
                        />
                      </EuiFlexItem>
                    ) : null}
                    {ttySupplemental.beta ? (
                      <EuiFlexItem grow={false}>
                        <EuiBetaBadge
                          label="beta"
                          size="s"
                          data-test-subj={getTestId('linux-tty_ioBadge')}
                        />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexGroup>
        </OsProtectionRow>
      </SettingCard>
    );
  }
);
EventCollectionSection.displayName = 'EventCollectionSection';
