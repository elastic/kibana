/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTitle,
  EuiButtonEmpty,
  EuiContextMenu,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { clearOverviewStatusState } from '../../../state/overview_status';
import {
  selectOverviewState,
  setOverviewPageStateAction,
  updateManagementPageStateAction,
} from '../../../state';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';

export const ShowAllSpaces: React.FC = () => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <span>
            {i18n.translate('xpack.synthetics.showAllSpaces.spacesTextLabel', {
              defaultMessage: 'Spaces',
            })}
          </span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <SelectablePopover />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SelectablePopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { space } = useKibanaSpace();
  const [showFromAllSpacesVal, setShowFromAllSpacesVal] = useSessionStorage(
    'SyntheticsShowFromAllSpaces',
    false
  );
  const dispatch = useDispatch();

  useEffect(() => {
    if (showFromAllSpacesVal !== undefined) {
      dispatch(
        setOverviewPageStateAction({
          showFromAllSpaces: showFromAllSpacesVal,
        })
      );
      dispatch(
        updateManagementPageStateAction({
          showFromAllSpaces: showFromAllSpacesVal,
        })
      );
    }
  }, [dispatch, showFromAllSpacesVal]);

  const {
    pageState: { showFromAllSpaces },
  } = useSelector(selectOverviewState);

  const updateState = (val: boolean) => {
    setShowFromAllSpacesVal(val);
    dispatch(clearOverviewStatusState());
    dispatch(
      setOverviewPageStateAction({
        showFromAllSpaces: val,
      })
    );
    dispatch(
      updateManagementPageStateAction({
        showFromAllSpaces: val,
      })
    );
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiButtonEmpty
      data-test-subj="syntheticsClickMeToLoadAContextMenuButton"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      size="xs"
    >
      {showFromAllSpaces ? ALL_SPACES_LABEL : space?.name || space?.id}
    </EuiButtonEmpty>
  );
  return (
    <EuiPopover
      id="contextMenuSpaces"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: SHOW_MONITORS_FROM,
            items: [
              {
                name: `${CURRENT_SPACE_LABEL} - ${space?.name || space?.id}`,
                onClick: () => {
                  updateState(false);
                },
                icon: showFromAllSpaces ? 'empty' : 'check',
              },
              {
                name: ALL_SPACES_LABEL,
                onClick: () => {
                  updateState(true);
                },
                icon: showFromAllSpaces ? 'check' : 'empty',
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
};

const ALL_SPACES_LABEL = i18n.translate('xpack.synthetics.showAllSpaces.allSpacesLabel', {
  defaultMessage: 'All permitted spaces',
});

const CURRENT_SPACE_LABEL = i18n.translate('xpack.synthetics.showAllSpaces.currentSpaceLabel', {
  defaultMessage: 'Current space',
});

const SHOW_MONITORS_FROM = i18n.translate('xpack.synthetics.showAllSpaces.showMonitorsFrom', {
  defaultMessage: 'Show monitors from',
});
