/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import _ from 'lodash';
import type { Color, Modifiers } from 'chalk';
import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  Table as TableType,
  TableInstanceOptions,
  CharName,
  HorizontalAlignment,
} from 'cli-table3';

type ChalkColor = typeof Color | typeof Modifiers;
type CharType = 'border' | 'noBorder' | 'outsideBorder' | 'pageDivider' | 'allBorders';

/**
 * Colors for the table
 */

function color(val: string | number | null, c: ChalkColor) {
  return chalk[c](val);
}

export function gray(val: number | string) {
  return color(val, 'gray');
}

function colorIf(val: number | null, c: ChalkColor) {
  let value: number | string | null = val;
  let colorString = c;
  if (val === 0 || val == null) {
    value = '-';
    colorString = 'gray';
  }

  return color(value, colorString);
}

const wrapBordersInGray = (chars: Record<CharName, string>) => {
  return _.mapValues(chars, (char) => {
    if (char) {
      return chalk.gray(char);
    }

    return char;
  });
};

/**
 * Formatting
 */

const logEmptyLine = () => console.log('');

const addNewlineAtEveryNChar = (str: string, n: number) => {
  if (!str) {
    return str;
  }

  const result = [];
  let idx = 0;

  while (idx < str.length) {
    result.push(str.slice(idx, (idx += n)));
  }

  return result.join('\n');
};

function getWidth(table: TableType, index: number) {
  // get the true width of a table's column,
  // based off of calculated table options for that column
  const columnWidth = table.options.colWidths[index];

  if (columnWidth) {
    return (
      columnWidth - (table.options.style['padding-left'] + table.options.style['padding-right'])
    );
  }

  throw new Error('Unable to get width for column');
}

function formatSymbolSummary(failures: number) {
  return failures ? chalk.red('✖') : chalk.green('✔');
}

function formatPath(name: string, n: number | undefined, pathColor: ChalkColor = 'reset') {
  if (!name) return '';

  let newName = name;
  const fakeCwdPath = process.env.FAKE_CWD_PATH;

  if (fakeCwdPath && process.env.CYPRESS_INTERNAL_ENV === 'test') {
    // if we're testing within Cypress, we want to strip out
    // the current working directory before calculating the stdout tables
    // this will keep our snapshots consistent everytime we run
    const cwdPath = process.cwd();

    newName = name.split(cwdPath).join(fakeCwdPath);

    newName = process.platform === 'darwin' && name.startsWith('/private') ? name.slice(8) : name;
  }

  if (n) {
    const nameWithNewLines = addNewlineAtEveryNChar(newName, n);

    return `${color(nameWithNewLines, pathColor)}`;
  }

  return `${color(name, pathColor)}`;
}

function widestLine(str: string) {
  let lineWidth = 0;

  for (const line of str.split('\n')) {
    lineWidth = Math.max(lineWidth, line.length);
  }

  return lineWidth;
}

/**
 * Utils
 */

function durationInMinutes(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = parseInt(((ms % 60000) / 1000).toFixed(0), 10);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const getBordersLength = (left: string, right: string) => {
  return _.chain([left, right]).compact().map(widestLine).sum().value();
};

const getChars = (type: CharType) => {
  switch (type) {
    case 'border':
      return {
        'top-mid': '',
        'top-left': '  ┌',
        left: '  │',
        'left-mid': '  ├',
        middle: '',
        'mid-mid': '',
        right: '│',
        'bottom-mid': '',
        'bottom-left': '  └',
      };
    case 'noBorder':
      return {
        top: '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        left: '   ',
        'left-mid': '',
        middle: '',
        mid: '',
        'mid-mid': '',
        right: ' ',
        'right-mid': '',
        bottom: '',
        'bottom-left': '',
        'bottom-mid': '',
        'bottom-right': '',
      };
    case 'outsideBorder':
      return {
        // "top": ""
        'top-left': '  ┌',
        'top-mid': '',
        left: '  │',
        'left-mid': '',
        middle: '',
        mid: '',
        'mid-mid': '',
        'right-mid': '',
        'bottom-mid': '',
        'bottom-left': '  └',
      };
    case 'pageDivider':
      return {
        top: '─',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        bottom: '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        left: '',
        'left-mid': '',
        mid: '',
        'mid-mid': '',
        right: '',
        'right-mid': '',
        middle: '',
      };
    case 'allBorders':
      return {
        // this is default from cli-table mostly just for debugging,
        // if you want to see where borders would be drawn
        top: '─',
        'top-mid': '┬',
        'top-left': '┌',
        'top-right': '┐',
        bottom: '─',
        'bottom-mid': '┴',
        'bottom-left': '└',
        'bottom-right': '┘',
        left: '│',
        'left-mid': '├',
        mid: '─',
        'mid-mid': '┼',
        right: '│',
        'right-mid': '┤',
        middle: '│',
      };
    default:
      throw new Error(`Table chars type: "${type}" is not supported`);
  }
};

/**
 * Render
 */

function formatFooterSummary(results: CypressCommandLine.CypressRunResult) {
  const { totalFailed, runs, totalDuration, totalTests, totalPassed, totalPending, totalSkipped } =
    results;

  const isCanceled = _.some(runs, { skippedSpec: true });

  // pass or fail color
  const c = isCanceled ? 'magenta' : totalFailed ? 'red' : 'green';

  const phrase = (() => {
    if (isCanceled) {
      return 'The run was canceled';
    }

    // if we have any specs failing...
    if (!totalFailed) {
      return 'All specs passed!';
    }

    // number of specs
    const total = runs.length;
    const failingRuns = _.filter(runs, 'stats.failures').length;
    const percent = Math.round((failingRuns / total) * 100);

    return `${failingRuns} of ${total} failed (${percent}%)`;
  })();

  return [
    isCanceled ? '-' : formatSymbolSummary(totalFailed),
    color(phrase, c),
    gray(durationInMinutes(totalDuration)),
    colorIf(totalTests, 'reset'),
    colorIf(totalPassed, 'green'),
    colorIf(totalFailed, 'red'),
    colorIf(totalPending, 'cyan'),
    colorIf(totalSkipped, 'blue'),
  ];
}

export function renderSummaryTable(results: CypressCommandLine.CypressRunResult[]) {
  const parsedResults = _.reduce(
    results,
    (acc: CypressCommandLine.CypressRunResult, result) => {
      acc.startedTestsAt =
        acc.startedTestsAt && new Date(result.startedTestsAt) > new Date(acc.startedTestsAt)
          ? acc.startedTestsAt
          : result.startedTestsAt;
      acc.endedTestsAt =
        acc.endedTestsAt && new Date(result.endedTestsAt) < new Date(acc.endedTestsAt)
          ? acc.endedTestsAt
          : result.endedTestsAt;
      acc.totalDuration = (acc.totalDuration ?? 0) + result.totalDuration;
      acc.totalSuites = (acc.totalSuites ?? 0) + result.totalSuites;
      acc.totalTests = (acc.totalTests ?? 0) + result.totalTests;
      acc.totalPassed = (acc.totalPassed ?? 0) + result.totalPassed;
      acc.totalPending = (acc.totalPending ?? 0) + result.totalPending;
      acc.totalFailed = (acc.totalFailed ?? 0) + result.totalFailed;
      acc.totalSkipped = (acc.totalSkipped ?? 0) + result.totalSkipped;
      acc.browserPath = result.browserPath;
      acc.browserName = result.browserName;
      acc.browserVersion = result.browserVersion;
      acc.osName = result.osName;
      acc.osVersion = result.osVersion;
      acc.cypressVersion = result.cypressVersion;
      acc.config = result.config;
      acc.runs = ([] as CypressCommandLine.RunResult[]).concat(acc.runs ?? [], result.runs);
      return acc;
    },
    {} as CypressCommandLine.CypressRunResult
  );

  const { runs } = parsedResults;

  logEmptyLine();
  console.log(chalk.gray('='.repeat(100)));
  logEmptyLine();
  console.log(`  (${chalk.reset.underline.bold('Run Finished')})`);

  if (runs && runs.length) {
    const colAligns: HorizontalAlignment[] = [
      'left',
      'left',
      'right',
      'right',
      'right',
      'right',
      'right',
      'right',
    ];
    const colWidths = [3, 41, 11, 9, 9, 9, 9, 9];

    const table1 = table({
      colAligns,
      colWidths,
      type: 'noBorder',
      head: [
        '',
        gray('Spec'),
        '',
        gray('Tests'),
        gray('Passing'),
        gray('Failing'),
        gray('Pending'),
        gray('Skipped'),
      ],
    });

    const table2 = table({
      colAligns,
      colWidths,
      type: 'border',
    });

    const table3 = table({
      colAligns,
      colWidths,
      type: 'noBorder',
      head: formatFooterSummary(parsedResults),
    });

    _.each(runs, (run) => {
      const { spec, stats } = run;
      const ms = durationInMinutes(stats?.duration ?? 0);
      const formattedSpec = formatPath(spec.relative, getWidth(table2, 1));

      return table2.push([
        formatSymbolSummary(stats.failures),
        formattedSpec,
        color(ms, 'gray'),
        colorIf(stats.tests, 'reset'),
        colorIf(stats.passes, 'green'),
        colorIf(stats.failures, 'red'),
        colorIf(stats.pending, 'cyan'),
        colorIf(stats.skipped, 'blue'),
      ]);
    });

    logEmptyLine();
    logEmptyLine();
    console.log(renderTables(table1, table2, table3));
    logEmptyLine();
  }
}

const EXPECTED_SUM = 100;

const renderTables = (...tables: TableType[]) => {
  return _.chain([] as TableType[])
    .concat(tables)
    .invokeMap('toString')
    .join('\n')
    .value();
};

const table = (options: Partial<TableInstanceOptions> & { type: CharType }) => {
  const { type } = options;
  const defaults = {
    chars: {
      top: '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      bottom: '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      right: '│',
      'right-mid': '┤',
      middle: '│',
    },
    truncate: '…',
    colWidths: [],
    rowHeights: [],
    colAligns: [],
    rowAligns: [],
    style: {
      'padding-left': 1,
      'padding-right': 1,
      head: ['red'],
      border: ['grey'],
      compact: false,
    },
    head: [],
  };

  let { colWidths } = options;
  let chars = _.defaults(getChars(type), defaults.chars);

  _.defaultsDeep(options, {
    chars,
    style: {
      head: [],
      border: [],
      'padding-left': 1,
      'padding-right': 1,
    },
  });

  chars = options.chars ?? defaults.chars;

  if (colWidths) {
    const sum = _.sum(colWidths);

    if (sum !== EXPECTED_SUM) {
      throw new Error(`Expected colWidths array to sum to: ${EXPECTED_SUM}, instead got: ${sum}`);
    }

    const bordersLength = getBordersLength(chars.left, chars.right);

    if (bordersLength > 0) {
      // redistribute the columns to account for borders on each side...
      // and subtract  borders size from the largest width cell
      const largestCellWidth = _.max(colWidths);

      const index = _.indexOf(colWidths, largestCellWidth);

      colWidths = _.clone(colWidths);

      colWidths[index] = (largestCellWidth ?? 0) - bordersLength;
      options.colWidths = colWidths;
    }
  }

  options.chars = wrapBordersInGray(chars);

  return new Table(options);
};
