/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';
import { createUseRulesLink } from './create_use_rules_link';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('@kbn/observability-shared-plugin/public');

const useKibanaMock = useKibana as jest.Mock;
const useLinkPropsMock = useLinkProps as jest.Mock;

const mockServices = (settingValue: boolean | undefined) => {
  useKibanaMock.mockReturnValue({
    services:
      settingValue === undefined
        ? {}
        : {
            settings: {
              globalClient: {
                isDeclared: jest.fn().mockReturnValue(true),
                get: jest.fn().mockReturnValue(settingValue),
              },
            },
          },
  });
};

describe('createUseRulesLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLinkPropsMock.mockReturnValue({ href: '/stub' });
  });

  it('links to the classic rules tab when universal alerting is enabled', () => {
    mockServices(true);

    renderHook(() => createUseRulesLink()());

    expect(useLinkPropsMock).toHaveBeenCalledWith(
      { app: 'observabilityAlerting', pathname: '/rules/v1' },
      {}
    );
  });

  it('links to the stack management rules app when universal alerting is disabled', () => {
    mockServices(false);

    renderHook(() => createUseRulesLink()());

    expect(useLinkPropsMock).toHaveBeenCalledWith({ app: 'rules', pathname: '/' }, {});
  });

  it('reads the globally scoped universal alerting setting', () => {
    mockServices(true);

    renderHook(() => createUseRulesLink()());

    const { globalClient } = useKibanaMock().services.settings;
    expect(globalClient.isDeclared).toHaveBeenCalledWith(ALERTING_V2_ENABLED_SETTING_ID);
    expect(globalClient.get).toHaveBeenCalledWith(ALERTING_V2_ENABLED_SETTING_ID);
  });

  it('links to the stack management rules app when the setting is not declared', () => {
    useKibanaMock.mockReturnValue({
      services: {
        settings: {
          globalClient: {
            isDeclared: jest.fn().mockReturnValue(false),
            get: jest.fn().mockReturnValue(true),
          },
        },
      },
    });

    renderHook(() => createUseRulesLink()());

    expect(useLinkPropsMock).toHaveBeenCalledWith({ app: 'rules', pathname: '/' }, {});
  });

  it('falls back to the stack management rules app when settings are unavailable', () => {
    mockServices(undefined);

    renderHook(() => createUseRulesLink()());

    expect(useLinkPropsMock).toHaveBeenCalledWith({ app: 'rules', pathname: '/' }, {});
  });

  it('forwards link options to the stack management rules app', () => {
    mockServices(false);

    renderHook(() => createUseRulesLink()({ hrefOnly: true }));

    expect(useLinkPropsMock).toHaveBeenCalledWith(
      { app: 'rules', pathname: '/' },
      { hrefOnly: true }
    );
  });

  it('forwards link options to the classic rules tab', () => {
    mockServices(true);

    renderHook(() => createUseRulesLink()({ hrefOnly: true }));

    expect(useLinkPropsMock).toHaveBeenCalledWith(
      { app: 'observabilityAlerting', pathname: '/rules/v1' },
      { hrefOnly: true }
    );
  });
});
