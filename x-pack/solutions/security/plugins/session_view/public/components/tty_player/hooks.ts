/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SearchAddon } from './xterm_search';
import { useEuiTheme } from '../../hooks';
import { renderTruncatedMsg } from './ansi_helpers';

import type {
  IOLine,
  ProcessStartMarker,
  ProcessEvent,
  ProcessEventResults,
  ProcessEventsPage,
} from '../../../common';
import {
  IO_EVENTS_ROUTE,
  IO_EVENTS_PER_PAGE,
  QUERY_KEY_IO_EVENTS,
  DEFAULT_TTY_PLAYSPEED_MS,
  DEFAULT_TTY_FONT_SIZE,
  DEFAULT_TTY_ROWS,
  DEFAULT_TTY_COLS,
  TTY_LINE_SPLITTER_REGEX,
  TTY_LINES_PRE_SEEK,
  CURRENT_API_VERSION,
} from '../../../common/constants';

export const useFetchIOEvents = (
  index: string,
  sessionEntityId: string,
  sessionStartTime: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = useMemo(() => [QUERY_KEY_IO_EVENTS, sessionEntityId], [sessionEntityId]);

  const query = useInfiniteQuery(
    cachingKeys,
    async ({ pageParam = {} }) => {
      const { cursor } = pageParam;
      const res = await http.get<ProcessEventResults>(IO_EVENTS_ROUTE, {
        version: CURRENT_API_VERSION,
        query: {
          index,
          sessionEntityId,
          sessionStartTime,
          cursor,
        },
      });

      const events = res.events?.map((event: any) => event._source as ProcessEvent) ?? [];

      return { events, cursor, total: res.total };
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.events.length >= IO_EVENTS_PER_PAGE) {
          return {
            cursor: lastPage.events[lastPage.events.length - 1]['@timestamp'],
          };
        }
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  return query;
};

/**
 * flattens all pages of IO events into an array of lines, and builds up an array of process start markers
 */
export const useIOLines = (pages: ProcessEventsPage[] | undefined) => {
  const [cursor, setCursor] = useState(0);
  const [processedLines, setProcessedLines] = useState<IOLine[]>([]);
  const [processedMarkers, setProcessedMarkers] = useState<ProcessStartMarker[]>([]);
  const linesAndEntityIdMap = useMemo(() => {
    if (!pages) {
      return { lines: processedLines, processStartMarkers: processedMarkers };
    }

    const events = pages.reduce(
      (previous, current) => previous.concat(current.events || []),
      [] as ProcessEvent[]
    );
    const eventsToProcess = events.slice(cursor);
    const newMarkers: ProcessStartMarker[] = [];
    let newLines: IOLine[] = [];

    eventsToProcess.forEach((event, index) => {
      const { process } = event;
      if (process?.io?.text !== undefined && process.entity_id !== undefined) {
        const previousProcessId =
          newLines[newLines.length - 1]?.event?.process?.entity_id ||
          processedLines[processedLines.length - 1]?.event.process?.entity_id;

        if (previousProcessId !== process.entity_id) {
          const processLineInfo: ProcessStartMarker = {
            line: processedLines.length + newLines.length,
            event,
          };
          newMarkers.push(processLineInfo);
        }

        if (process.io.max_bytes_per_process_exceeded) {
          const marker = newMarkers.find(
            (item) => item.event.process?.entity_id === process.entity_id
          );
          if (marker) {
            marker.maxBytesExceeded = true;
          }
        }

        const splitLines = process.io.text.split(TTY_LINE_SPLITTER_REGEX);
        const combinedLines = [splitLines[0]];

        // delimiters e.g \r\n or cursor movements are merged with their line text
        // we start on an odd number so that cursor movements happen at the start of each line
        // this is needed for the search to work accurately
        for (let i = 1; i < splitLines.length - 1; i = i + 2) {
          combinedLines.push(splitLines[i] + splitLines[i + 1]);
        }

        const data: IOLine[] = combinedLines.map((line) => {
          return {
            event, // pointer to the event so it's easy to look up other details for the line
            value: line,
          };
        });

        newLines = newLines.concat(data);
      }
    });

    const lines = processedLines.concat(newLines);
    const processStartMarkers = processedMarkers.concat(newMarkers);

    if (newLines.length > 0) {
      setProcessedLines(lines);
    }

    if (newMarkers.length > 0) {
      setProcessedMarkers(processStartMarkers);
    }

    const newCursor = cursor + eventsToProcess.length;

    if (newCursor > cursor) {
      setCursor(newCursor);
    }

    return {
      lines,
      processStartMarkers,
    };
  }, [cursor, pages, processedLines, processedMarkers]);
  return linesAndEntityIdMap;
};

export interface XtermPlayerDeps {
  ref: React.RefObject<HTMLElement>;
  isPlaying: boolean;
  setIsPlaying(value: boolean): void;
  lines: IOLine[];
  fontSize: number;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetching?: boolean;
  policiesUrl?: string;
}

export const useXtermPlayer = ({
  ref,
  isPlaying,
  setIsPlaying,
  lines,
  fontSize,
  hasNextPage,
  fetchNextPage,
  isFetching,
  policiesUrl,
}: XtermPlayerDeps) => {
  const { euiTheme } = useEuiTheme();
  const { font, colors } = euiTheme;
  const [currentLine, setCurrentLine] = useState(0);
  const [playSpeed] = useState(DEFAULT_TTY_PLAYSPEED_MS); // potentially configurable
  const tty = lines?.[currentLine]?.event.process?.tty;
  const processName = lines?.[currentLine]?.event.process?.name;
  const [terminal, searchAddon] = useMemo(() => {
    const term = new Terminal({
      theme: {
        selectionBackground: colors.warning,
        selectionForeground: colors.ink,
        yellow: colors.warning,
      },
      fontFamily: font.familyCode,
      fontSize: DEFAULT_TTY_FONT_SIZE,
      scrollback: 0,
      convertEol: true,
      rows: DEFAULT_TTY_ROWS,
      cols: DEFAULT_TTY_COLS,
      allowProposedApi: true,
      allowTransparency: true,
    });

    const searchInstance = new SearchAddon();
    term.loadAddon(searchInstance);

    return [term, searchInstance];
  }, [font, colors]);

  useEffect(() => {
    if (ref.current && !terminal.element) {
      terminal.open(ref.current);
    }

    // even though we set scrollback: 0 above, xterm steals the wheel events and prevents the outer container from scrolling
    // this handler fixes that
    const onScroll = (event: WheelEvent) => {
      if ((event?.target as HTMLDivElement)?.offsetParent?.classList.contains('xterm-screen')) {
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('wheel', onScroll, true);

    return () => {
      window.removeEventListener('wheel', onScroll, true);
      terminal.dispose();
    };
  }, [terminal, ref]);

  const render = useCallback(
    (lineNumber: number, clear: boolean) => {
      if (lines.length === 0) {
        return;
      }

      let linesToPrint;

      if (clear) {
        linesToPrint = lines.slice(Math.max(0, lineNumber - TTY_LINES_PRE_SEEK), lineNumber + 1);

        try {
          terminal.reset();
          terminal.clear();
        } catch (err) {
          // noop
          // there is some random race condition with the jump to feature that causes these calls to error out.
        }
      } else {
        linesToPrint = lines.slice(lineNumber, lineNumber + 1);
      }

      linesToPrint.forEach((line, index) => {
        if (line?.value !== undefined) {
          terminal.write(line.value);
        }

        const nextLine = lines[lineNumber + index + 1];
        const maxBytesExceeded = line.event.process?.io?.max_bytes_per_process_exceeded;

        // if next line is start of next event
        // and process has exceeded max bytes
        // render msg
        if (!clear && (!nextLine || nextLine.event !== line.event) && maxBytesExceeded) {
          const msg = renderTruncatedMsg(tty, policiesUrl, processName);
          if (msg) {
            terminal.write(msg);
          }
        }
      });
    },
    [lines, policiesUrl, processName, terminal, tty]
  );

  useEffect(() => {
    const fontChanged = terminal.options.fontSize !== fontSize;
    const ttyChanged = tty && (terminal.rows !== tty?.rows || terminal.cols !== tty?.columns);

    if (fontChanged) {
      terminal.options.fontSize = fontSize;
    }

    if (tty?.rows && tty?.columns && ttyChanged) {
      terminal.resize(tty.columns, tty.rows);
    }

    if (fontChanged || ttyChanged) {
      // clear and rerender
      render(currentLine, true);
    }

    if (!isFetching && hasNextPage && fetchNextPage && currentLine >= lines.length - 100) {
      fetchNextPage();
    }
  }, [
    currentLine,
    fontSize,
    terminal,
    render,
    tty,
    hasNextPage,
    fetchNextPage,
    lines.length,
    isFetching,
  ]);

  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        if (!hasNextPage && currentLine === lines.length - 1) {
          setIsPlaying(false);
        } else {
          const nextLine = Math.min(lines.length - 1, currentLine + 1);
          render(nextLine, false);
          setCurrentLine(nextLine);
        }
      }, playSpeed);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [lines, currentLine, isPlaying, playSpeed, render, hasNextPage, fetchNextPage, setIsPlaying]);

  const seekToLine = useCallback(
    (index: any) => {
      setCurrentLine(index);

      render(index, true);
    },
    [render]
  );

  const search = useCallback(
    (query: string, startCol: number) => {
      searchAddon.findNext(query, { caseSensitive: false, lastLineOnly: true, startCol });
    },
    [searchAddon]
  );

  return {
    terminal,
    currentLine,
    seekToLine,
    search,
  };
};
