/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenu, EuiIcon, EuiPopover, useGeneratedHtmlId, EuiBadge } from '@elastic/eui';
import { useMonitorHealthColor } from '../../../hooks/use_monitor_health_color';
import { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';

export const LocationsBadge = ({ monitor }: { monitor: OverviewStatusMetaData }) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const locationsLabel = i18n.translate(
    'xpack.synthetics.locationsBadge.clickMeToLoadButtonLabel',
    {
      defaultMessage: '{locations} Locations',
      values: {
        locations: monitor.locations.length,
      },
    }
  );

  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'contextMenuPopover',
  });

  const closePopover = () => {
    setPopover(false);
  };

  const getColor = useMonitorHealthColor();

  const panels = [
    {
      id: 0,
      title: locationsLabel,
      items: monitor.locations.map((location) => {
        return {
          name: location.label,
          icon: <EuiIcon type="dot" color={getColor(location.status)} />,
          onClick: () => {
            closePopover();
          },
          'data-test-subj': `syntheticsLocationsBadgeLocation-${location.label}`,
        };
      }),
    },
  ];

  const button = (
    <EuiBadge
      data-test-subj="syntheticsLocationsBadgeClickMeToLoadAContextMenuButton"
      iconType="arrowDown"
      iconSide="right"
      onMouseOver={() => {
        setPopover(true);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setPopover(!isPopoverOpen);
      }}
      iconOnClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setPopover(!isPopoverOpen);
      }}
      iconOnClickAriaLabel={'Click to open context menu'}
      onClickAriaLabel="Click to open context menu"
    >
      {i18n.translate('xpack.synthetics.locationsBadge.clickMeToLoadButtonLabel', {
        defaultMessage: '{locations} Locations',
        values: {
          locations: monitor.locations.length,
        },
      })}
    </EuiBadge>
  );

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
