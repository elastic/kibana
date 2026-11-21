/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { useKibana } from '../../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../../common/components/user_privileges/__mocks__';
import { endpointPageHttpMock } from '../../mocks';
import type { HostInfo } from '../../../../../../common/endpoint/types';
import { EndpointDetailsContent } from './endpoint_details_content';

jest.mock('../../../../../common/lib/kibana/kibana_react', () => {
  const originalModule = jest.requireActual('../../../../../common/lib/kibana/kibana_react');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          getUrlForApp: (appId: string, options?: { path?: string }) =>
            `/app/${appId}${options?.path}`,
          navigateToApp: jest.fn(),
        },
      },
    }),
  };
});
jest.mock('../../../../../common/components/user_privileges');

describe('EndpointDetailsContent', () => {
  let render: (hostInfo: HostInfo) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let httpMocks: ReturnType<typeof endpointPageHttpMock>;
  let hostInfo: HostInfo;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    (useKibana as jest.Mock).mockReturnValue({ services: mockedContext.startServices });
    httpMocks = endpointPageHttpMock(mockedContext.coreStart.http);
    (useUserPrivileges as jest.Mock).mockReturnValue(getUserPrivilegesMockDefaultValue());

    hostInfo = httpMocks.responseProvider.metadataDetails();

    act(() => {
      mockedContext.history.push(
        '/administration/endpoints?selected_endpoint=5fe11314-678c-413e-87a2-b4a3461878ee'
      );
    });

    render = (info: HostInfo) =>
      (renderResult = mockedContext.render(<EndpointDetailsContent hostInfo={info} />));
  });

  afterEach(() => {
    (useUserPrivileges as jest.Mock).mockClear();
  });

  // The `host.ip` field is typed as `string[]`, but a custom ingest pipeline can
  // overwrite it with a string, and the whole `host` object can be missing, which
  // used to white-screen the flyout. See security-team#17020,
  // sdh-security-team#1648/#1709.
  it('should render each IP when host.ip is an array', () => {
    // @ts-expect-error TS2540 mutating readonly mocked data
    hostInfo.metadata.host.ip = ['10.0.0.1', '10.0.0.2'];

    render(hostInfo);

    expect(renderResult.getByText('10.0.0.1')).toBeInTheDocument();
    expect(renderResult.getByText('10.0.0.2')).toBeInTheDocument();
  });

  it('should render without crashing when host.ip is a single string', () => {
    // @ts-expect-error TS2540 simulate a custom pipeline coercing the array to a string
    hostInfo.metadata.host.ip = '10.0.0.1';

    expect(() => render(hostInfo)).not.toThrow();
    expect(renderResult.getByText('10.0.0.1')).toBeInTheDocument();
  });

  it('should render without crashing when host.ip is undefined', () => {
    // @ts-expect-error TS2790 simulate the entire host section being absent
    delete hostInfo.metadata.host.ip;

    expect(() => render(hostInfo)).not.toThrow();
    // The flyout still renders its other fields (e.g. the IP Address row title)
    // instead of white-screening the whole details panel.
    expect(renderResult.getByText('IP Address')).toBeInTheDocument();
  });
});
