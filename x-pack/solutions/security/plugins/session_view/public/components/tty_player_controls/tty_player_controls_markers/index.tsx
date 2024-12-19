/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiRange, EuiRangeProps, EuiToolTip } from '@elastic/eui';
import type { ProcessStartMarker } from '../../../../common';
import { useStyles } from './styles';
import { PlayHead } from './play_head';

type Props = {
  processStartMarkers: ProcessStartMarker[];
  linesLength: number;
  currentLine: number;
  onChange: EuiRangeProps['onChange'];
  onSeekLine(line: number): void;
};

export enum TTYPlayerLineMarkerType {
  ProcessChanged = 'process_changed',
  ProcessDataLimitReached = 'data_limited',
}

type TTYPlayerLineMarker = {
  line: number;
  type: TTYPlayerLineMarkerType;
  name: string;
};

export const TTYPlayerControlsMarkers = ({
  processStartMarkers,
  linesLength,
  currentLine,
  onChange,
  onSeekLine,
}: Props) => {
  const progress = useMemo(
    () => (currentLine / (linesLength - 1)) * 100,
    [currentLine, linesLength]
  );

  const styles = useStyles(progress);

  const markers = useMemo(() => {
    if (processStartMarkers.length < 1) {
      return [];
    }
    return processStartMarkers.map(
      ({ event, line, maxBytesExceeded }) =>
        ({
          type: maxBytesExceeded
            ? TTYPlayerLineMarkerType.ProcessDataLimitReached
            : TTYPlayerLineMarkerType.ProcessChanged,
          line,
          name: event.process?.name,
        } as TTYPlayerLineMarker)
    );
  }, [processStartMarkers]);

  const markersLength = markers.length;

  const currentSelectedType = useMemo(() => {
    if (!markersLength) {
      return undefined;
    }
    const currentSelected =
      currentLine >= markers[markersLength - 1].line
        ? markersLength - 1
        : markers.findIndex((marker) => marker.line > currentLine) - 1;

    return markers[Math.max(0, currentSelected)].type;
  }, [currentLine, markers, markersLength]);

  if (!markersLength) {
    return null;
  }

  return (
    <>
      <EuiRange
        value={currentLine}
        min={0}
        max={Math.max(0, linesLength - 1)}
        onChange={onChange}
        fullWidth
        showRange
        css={styles.range}
      />
      <PlayHead css={styles.playHead(currentSelectedType)} />
      <div css={styles.markersOverlay}>
        {markers.map(({ line, type, name }, idx) => {
          const selected =
            currentLine >= line &&
            (idx === markersLength - 1 || currentLine < markers[idx + 1].line);

          // markers positions are absolute, setting higher z-index on the selected one in case there
          // are severals next to each other
          const markerWrapperPositioning = {
            left: `${(line / (linesLength - 1)) * 100}%`,
            zIndex: selected ? 3 : 2,
          };

          const onMarkerClick = () => onSeekLine(line);

          return (
            <div key={idx} style={markerWrapperPositioning} css={styles.markerWrapper}>
              <EuiToolTip title={name}>
                <button
                  type="button"
                  value={line}
                  tabIndex={-1}
                  title={type}
                  css={styles.marker(type, selected)}
                  onClick={onMarkerClick}
                  aria-label={name}
                >
                  {name}
                </button>
              </EuiToolTip>
            </div>
          );
        })}
      </div>
    </>
  );
};
