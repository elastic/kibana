/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_OPTION_KEY, getSelectableOptions } from './get_selectable_options';

const getOptions = (params: Partial<Parameters<typeof getSelectableOptions>[0]> = {}) =>
  getSelectableOptions({
    options: ['aws', 'azure'],
    invalidOptions: [],
    selected: [],
    isLoading: false,
    hasError: false,
    getOptionLabel: (option) => option.toUpperCase(),
    ...params,
  });

const summary = (options: ReturnType<typeof getOptions>) =>
  options.map(({ key, label, checked }) => ({ key, label, checked }));

describe('getSelectableOptions', () => {
  it('lists the options with the selected ones checked', () => {
    expect(summary(getOptions({ selected: ['azure'] }))).toEqual([
      { key: 'aws', label: 'AWS', checked: undefined },
      { key: 'azure', label: 'AZURE', checked: 'on' },
    ]);
  });

  it('adds the all option first, checked when nothing is selected', () => {
    expect(summary(getOptions({ allLabel: 'All providers' }))[0]).toEqual({
      key: ALL_OPTION_KEY,
      label: 'All providers',
      checked: 'on',
    });
    expect(summary(getOptions({ allLabel: 'All providers', selected: ['aws'] }))[0].checked).toBe(
      undefined
    );
  });

  it('lists the invalid options that are selected before the others', () => {
    expect(
      summary(getOptions({ options: ['aws'], invalidOptions: ['gcp'], selected: ['gcp'] }))
    ).toEqual([
      { key: 'gcp', label: 'GCP', checked: 'on' },
      { key: 'aws', label: 'AWS', checked: undefined },
    ]);
  });

  it('does not list an invalid option that is no longer selected', () => {
    expect(
      summary(getOptions({ options: ['aws'], invalidOptions: ['gcp'], selected: [] }))
    ).toEqual([{ key: 'aws', label: 'AWS', checked: undefined }]);
  });

  it('lists the selected options when there is an error', () => {
    expect(summary(getOptions({ options: [], selected: ['aws'], hasError: true }))).toEqual([
      { key: 'aws', label: 'AWS', checked: 'on' },
    ]);
  });

  it('lists the selected options while loading, before the values arrive', () => {
    expect(summary(getOptions({ options: [], selected: ['aws'], isLoading: true }))).toEqual([
      { key: 'aws', label: 'AWS', checked: 'on' },
    ]);
  });

  it('does not repeat an option', () => {
    const keys = getOptions({
      options: ['aws', 'gcp'],
      invalidOptions: ['gcp'],
      selected: ['aws', 'gcp'],
      hasError: true,
    }).map(({ key }) => key);

    expect(keys).toEqual(['aws', 'gcp']);
  });
});
