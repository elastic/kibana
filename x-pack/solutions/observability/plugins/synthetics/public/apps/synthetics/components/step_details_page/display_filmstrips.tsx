/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiPopover } from '@elastic/eui';
import { useFilmstrips } from './hooks/use_filmstrips';

export const DisplayFilmstrips = ({
  checkGroup,
  stepIndex,
}: {
  checkGroup: string;
  stepIndex?: number;
}) => {
  const { filmstrips } = useFilmstrips({ checkGroup, stepIndex });
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState('');

  const onMouseEnter = useCallback(
    (timestamp: string) => {
      setIsImagePopoverOpen(timestamp);
    },
    [setIsImagePopoverOpen]
  );

  const onMouseLeave = useCallback(
    (timestamp: string) => {
      setIsImagePopoverOpen('');
    },
    [setIsImagePopoverOpen]
  );

  const startingTimestamp = filmstrips.length > 0 ? filmstrips[0].timestamp : '';

  return (
    <EuiFlexGroup gutterSize="xs">
      {filmstrips.map((filmstrip, index) => {
        const currentTime =
          new Date(filmstrip.timestamp).getTime() - new Date(startingTimestamp).getTime();
        return (
          <EuiFlexItem key={index}>
            <EuiPopover
              anchorPosition="leftDown"
              button={
                <EuiImage
                  src={'data:image/jpeg;charset=utf-8;base64,' + filmstrip.synthetics?.blob}
                  alt="image"
                  allowFullScreen={true}
                  size="s"
                  onMouseEnter={() => onMouseEnter(filmstrip.id)}
                  onMouseLeave={() => onMouseLeave(filmstrip.id)}
                  caption={currentTime + ' ms'}
                />
              }
              isOpen={filmstrip.id === isImagePopoverOpen}
            >
              <EuiImage
                src={'data:image/jpeg;charset=utf-8;base64,' + filmstrip.synthetics?.blob}
                alt="image"
                allowFullScreen={true}
                size="xl"
              />
            </EuiPopover>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
