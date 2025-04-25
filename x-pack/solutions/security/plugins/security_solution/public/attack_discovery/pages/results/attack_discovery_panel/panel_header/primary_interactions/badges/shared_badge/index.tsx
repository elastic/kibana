/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AttackDiscovery, type AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';

import { useAttackDiscoveryBulk } from '../../../../../../use_attack_discovery_bulk';
import { isAttackDiscoveryAlert } from '../../../../../../utils/is_attack_discovery_alert';
import * as i18n from './translations';

const LIST_PROPS = {
  isVirtualized: false,
  rowHeight: 60,
};

interface Props {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
}

interface SharedBadgeOptionData {
  description?: string;
}

const SharedBadgeComponent: React.FC<Props> = ({ attackDiscovery }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onBadgeButtonClick = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'visibilityFilterGroupPopover',
  });

  const isShared = useMemo(() => {
    if (!isAttackDiscoveryAlert(attackDiscovery)) {
      return false;
    }

    if (isEmpty(attackDiscovery.users)) {
      return true;
    }

    return attackDiscovery.users != null && attackDiscovery.users.length > 1;
  }, [attackDiscovery]);

  const [items, setItems] = useState<Array<EuiSelectableOption<SharedBadgeOptionData>>>([
    {
      checked: !isShared ? 'on' : undefined,
      data: {
        description: i18n.ONLY_VISIBLE_TO_YOU,
      },
      'data-test-subj': 'notShared',
      label: i18n.NOT_SHARED,
    },
    {
      checked: isShared ? 'on' : undefined,
      data: {
        description: i18n.VISIBLE_TO_YOUR_TEAM,
      },
      'data-test-subj': 'shared',
      label: i18n.SHARED,
    },
  ]);

  const selectedLabel = useMemo(() => {
    const firstSelected = items.find((item) => item.checked === 'on');

    return firstSelected != null ? firstSelected.label : items[0].label;
  }, [items]);

  const renderOption = useCallback(
    (option: EuiSelectableOption<SharedBadgeOptionData>) => (
      <EuiFlexGroup
        css={css`
          height: 53px;
          width: 132px;
        `}
        direction="column"
        gutterSize="none"
        justifyContent="center"
      >
        <EuiFlexItem grow={false}>
          <EuiText
            css={css`
              font-weight: bold;
            `}
            data-test-subj="optionLabel"
            size="s"
          >
            {option.label}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText data-test-subj="optionDescription" size="s">
            {option.description}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const button = useMemo(
    () => (
      <EuiBadge
        aria-label={i18n.VISIBILITY}
        color="hollow"
        data-test-subj="sharedBadgeButton"
        iconType="arrowDown"
        iconSide="right"
        onClick={onBadgeButtonClick}
        onClickAriaLabel={i18n.SELECT_VISIBILITY_ARIA_LABEL}
      >
        {selectedLabel}
      </EuiBadge>
    ),
    [onBadgeButtonClick, selectedLabel]
  );

  const { mutateAsync: attackDiscoveryBulk } = useAttackDiscoveryBulk();

  const onSelectableChange = useCallback(
    async (newOptions: EuiSelectableOption[]) => {
      setItems(newOptions);

      if (isAttackDiscoveryAlert(attackDiscovery)) {
        const visibility = newOptions[0].checked === 'on' ? 'not_shared' : 'shared';

        await attackDiscoveryBulk({
          ids: [attackDiscovery.id],
          visibility,
        });
      }
    },
    [attackDiscovery, attackDiscoveryBulk]
  );

  return (
    <EuiPopover
      button={button}
      closePopover={closePopover}
      data-test-subj="sharedBadgePopover"
      id={filterGroupPopoverId}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiSelectable
        aria-label={i18n.VISIBILITY}
        data-test-subj="sharedBadge"
        listProps={LIST_PROPS}
        options={items}
        onChange={onSelectableChange}
        renderOption={renderOption}
        singleSelection={true}
      >
        {(list) => (
          <div
            css={css`
              width: 230px;
            `}
          >
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const SharedBadge = React.memo(SharedBadgeComponent);
