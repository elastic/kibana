/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_ID,
  type AttackDiscovery,
  type AttackDiscoveryAlert,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

import { AccordionButton } from '../accordion_button';
import { Badges } from '../badges';
import { DetailsFlyout } from '../../../../../settings_flyout/schedule/details_flyout';
import * as i18n from './translations';
import { useKibanaFeatureFlags } from '../../../../../use_kibana_feature_flags';
import { isAttackDiscoveryAlert } from '../../../../../utils/is_attack_discovery_alert';

interface Props {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
  isOpen: 'open' | 'closed';
  isSelected: boolean;
  onToggle?: (newState: 'open' | 'closed') => void;
  replacements?: Replacements;
  setIsOpen: React.Dispatch<React.SetStateAction<'open' | 'closed'>>;
  setIsSelected?: ({ id, selected }: { id: string; selected: boolean }) => void;
  showAnonymized?: boolean;
}

const TitleComponent: React.FC<Props> = ({
  attackDiscovery,
  isOpen,
  isSelected,
  onToggle,
  replacements,
  setIsOpen,
  setIsSelected,
  showAnonymized = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  const htmlId = useGeneratedHtmlId({
    prefix: 'attackDiscoveryAccordion',
  });

  const checkboxId = useGeneratedHtmlId({
    prefix: 'attackDiscoveryCheckbox',
  });

  const [scheduleDetailsId, setScheduleDetailsId] = useState<string | undefined>(undefined);

  const onCheckboxChange = useCallback(() => {
    if (attackDiscovery.id != null) {
      setIsSelected?.({ id: attackDiscovery.id, selected: !isSelected });
    }
  }, [attackDiscovery.id, isSelected, setIsSelected]);

  const updateIsOpen = useCallback(() => {
    const newState = isOpen === 'open' ? 'closed' : 'open';

    setIsOpen(newState);
    onToggle?.(newState);
  }, [isOpen, onToggle, setIsOpen]);

  const alertRuleUuid = useMemo(
    () => (isAttackDiscoveryAlert(attackDiscovery) ? attackDiscovery.alertRuleUuid : undefined),
    [attackDiscovery]
  );

  const isScheduled = useMemo(
    () => alertRuleUuid != null && alertRuleUuid !== ATTACK_DISCOVERY_AD_HOC_RULE_ID,
    [alertRuleUuid]
  );

  const openScheduleDetails = useCallback(() => {
    setScheduleDetailsId(alertRuleUuid);
  }, [alertRuleUuid]);

  const onClose = useCallback(() => setScheduleDetailsId(undefined), []);

  const accordionButton = useMemo(() => {
    isAttackDiscoveryAlert(attackDiscovery);

    return (
      <AccordionButton
        connectorName={
          isAttackDiscoveryAlert(attackDiscovery) ? attackDiscovery.connectorName : undefined
        }
        isLoading={false}
        replacements={replacements}
        showAnonymized={showAnonymized}
        title={attackDiscovery.title}
      />
    );
  }, [attackDiscovery, replacements, showAnonymized]);

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        css={css`
          gap: ${euiTheme.size.xs};
        `}
        data-test-subj="title"
        gutterSize="none"
        responsive={false}
        wrap={true}
      >
        {attackDiscoveryAlertsEnabled && (
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              checked={isSelected}
              css={css`
                display: inline;
              `}
              data-test-subj="attackDiscoveryCheckbox"
              id={checkboxId}
              onChange={onCheckboxChange}
            />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiAccordion
            buttonContent={accordionButton}
            data-test-subj="attackDiscoveryAccordion"
            forceState={isOpen}
            id={htmlId}
            onToggle={updateIsOpen}
          >
            <span data-test-subj="emptyAccordionContent" />
          </EuiAccordion>
        </EuiFlexItem>

        {isScheduled && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.SCHEDULED_ATTACK_DISCOVERY}
              data-test-subj="scheduledTooltip"
              position="top"
            >
              <EuiButtonIcon
                aria-label={i18n.OPEN_SCHEDULE_DETAILS}
                data-test-subj="scheduleButton"
                iconType="calendar"
                onClick={openScheduleDetails}
                size="xs"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <Badges attackDiscovery={attackDiscovery} />
        </EuiFlexItem>
      </EuiFlexGroup>

      {scheduleDetailsId && <DetailsFlyout scheduleId={scheduleDetailsId} onClose={onClose} />}
    </>
  );
};

export const Title = React.memo(TitleComponent);
