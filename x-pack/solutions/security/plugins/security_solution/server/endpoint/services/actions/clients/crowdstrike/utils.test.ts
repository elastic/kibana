/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapParametersToCrowdStrikeArguments } from './utils';

describe('mapParametersToCrowdStrikeArguments', () => {
  it('returns command with single word parameter as is', () => {
    const result = mapParametersToCrowdStrikeArguments('runscript', { raw: 'echo Hello' });
    expect(result).toBe('runscript --Raw=```echo Hello```');
  });

  it('wraps multi-word parameter in triple backticks', () => {
    const result = mapParametersToCrowdStrikeArguments('runscript', {
      commandLine: 'echo Hello World',
    });
    expect(result).toBe(`runscript --CommandLine='echo Hello World'`);
  });

  it('leaves parameter already wrapped in triple backticks unchanged', () => {
    const result = mapParametersToCrowdStrikeArguments('runscript', {
      commandLine: '```echo Hello World```',
    });
    expect(result).toBe('runscript --CommandLine=```echo Hello World```');
  });

  it('trims spaces from parameter values', () => {
    const result = mapParametersToCrowdStrikeArguments('runscript', { raw: '  echo Hello  ' });
    expect(result).toBe('runscript --Raw=```echo Hello```');
  });

  it('handles multiple parameters correctly', () => {
    const result = mapParametersToCrowdStrikeArguments('runscript', {
      raw: 'echo Hello',
      commandLine: 'echo Hello World',
      hostPath: '/home/user',
      cloudFile: 'file.txt',
    });
    expect(result).toBe(
      "runscript --Raw=```echo Hello``` --CommandLine='echo Hello World' --HostPath=/home/user --CloudFile=file.txt"
    );
  });

  it('returns command with no parameters correctly', () => {
    const result = mapParametersToCrowdStrikeArguments('runscript', {});
    expect(result).toBe('runscript ');
  });
});
