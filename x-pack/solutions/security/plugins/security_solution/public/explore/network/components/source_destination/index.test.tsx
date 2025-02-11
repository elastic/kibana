/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { get } from 'lodash/fp';
import React from 'react';
import { render, screen, within } from '@testing-library/react';

import { asArrayIfExists } from '../../../../common/lib/helpers';
import { getMockNetflowData } from '../../../../common/mock';
import { TestProviders } from '../../../../common/mock/test_providers';
import { ID_FIELD_NAME } from '../../../../common/components/event_details/event_id';
import { DESTINATION_IP_FIELD_NAME, SOURCE_IP_FIELD_NAME } from '../ip';
import { DESTINATION_PORT_FIELD_NAME, SOURCE_PORT_FIELD_NAME } from '../port/helpers';
import {
  DESTINATION_BYTES_FIELD_NAME,
  DESTINATION_PACKETS_FIELD_NAME,
  SOURCE_BYTES_FIELD_NAME,
  SOURCE_PACKETS_FIELD_NAME,
} from './source_destination_arrows';
import * as i18n from '../../../../timelines/components/timeline/body/renderers/translations';

import { SourceDestination } from '.';
import {
  DESTINATION_GEO_CITY_NAME_FIELD_NAME,
  DESTINATION_GEO_CONTINENT_NAME_FIELD_NAME,
  DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME,
  DESTINATION_GEO_COUNTRY_NAME_FIELD_NAME,
  DESTINATION_GEO_REGION_NAME_FIELD_NAME,
  SOURCE_GEO_CITY_NAME_FIELD_NAME,
  SOURCE_GEO_CONTINENT_NAME_FIELD_NAME,
  SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME,
  SOURCE_GEO_COUNTRY_NAME_FIELD_NAME,
  SOURCE_GEO_REGION_NAME_FIELD_NAME,
} from './geo_fields';
import {
  NETWORK_BYTES_FIELD_NAME,
  NETWORK_COMMUNITY_ID_FIELD_NAME,
  NETWORK_DIRECTION_FIELD_NAME,
  NETWORK_PACKETS_FIELD_NAME,
  NETWORK_PROTOCOL_FIELD_NAME,
  NETWORK_TRANSPORT_FIELD_NAME,
} from './field_names';

jest.mock('../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

const getSourceDestinationInstance = () => (
  <SourceDestination
    contextId="test"
    destinationBytes={asArrayIfExists(get(DESTINATION_BYTES_FIELD_NAME, getMockNetflowData()))}
    destinationGeoContinentName={asArrayIfExists(
      get(DESTINATION_GEO_CONTINENT_NAME_FIELD_NAME, getMockNetflowData())
    )}
    destinationGeoCountryName={asArrayIfExists(
      get(DESTINATION_GEO_COUNTRY_NAME_FIELD_NAME, getMockNetflowData())
    )}
    destinationGeoCountryIsoCode={asArrayIfExists(
      get(DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME, getMockNetflowData())
    )}
    destinationGeoRegionName={asArrayIfExists(
      get(DESTINATION_GEO_REGION_NAME_FIELD_NAME, getMockNetflowData())
    )}
    destinationGeoCityName={asArrayIfExists(
      get(DESTINATION_GEO_CITY_NAME_FIELD_NAME, getMockNetflowData())
    )}
    destinationIp={asArrayIfExists(get(DESTINATION_IP_FIELD_NAME, getMockNetflowData()))}
    destinationPackets={asArrayIfExists(get(DESTINATION_PACKETS_FIELD_NAME, getMockNetflowData()))}
    destinationPort={asArrayIfExists(get(DESTINATION_PORT_FIELD_NAME, getMockNetflowData()))}
    eventId={get(ID_FIELD_NAME, getMockNetflowData())}
    networkBytes={asArrayIfExists(get(NETWORK_BYTES_FIELD_NAME, getMockNetflowData()))}
    networkCommunityId={asArrayIfExists(get(NETWORK_COMMUNITY_ID_FIELD_NAME, getMockNetflowData()))}
    networkDirection={asArrayIfExists(get(NETWORK_DIRECTION_FIELD_NAME, getMockNetflowData()))}
    networkPackets={asArrayIfExists(get(NETWORK_PACKETS_FIELD_NAME, getMockNetflowData()))}
    networkProtocol={asArrayIfExists(get(NETWORK_PROTOCOL_FIELD_NAME, getMockNetflowData()))}
    sourceBytes={asArrayIfExists(get(SOURCE_BYTES_FIELD_NAME, getMockNetflowData()))}
    sourceGeoContinentName={asArrayIfExists(
      get(SOURCE_GEO_CONTINENT_NAME_FIELD_NAME, getMockNetflowData())
    )}
    sourceGeoCountryName={asArrayIfExists(
      get(SOURCE_GEO_COUNTRY_NAME_FIELD_NAME, getMockNetflowData())
    )}
    sourceGeoCountryIsoCode={asArrayIfExists(
      get(SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME, getMockNetflowData())
    )}
    sourceGeoRegionName={asArrayIfExists(
      get(SOURCE_GEO_REGION_NAME_FIELD_NAME, getMockNetflowData())
    )}
    sourceGeoCityName={asArrayIfExists(get(SOURCE_GEO_CITY_NAME_FIELD_NAME, getMockNetflowData()))}
    sourceIp={asArrayIfExists(get(SOURCE_IP_FIELD_NAME, getMockNetflowData()))}
    sourcePackets={asArrayIfExists(get(SOURCE_PACKETS_FIELD_NAME, getMockNetflowData()))}
    sourcePort={asArrayIfExists(get(SOURCE_PORT_FIELD_NAME, getMockNetflowData()))}
    transport={asArrayIfExists(get(NETWORK_TRANSPORT_FIELD_NAME, getMockNetflowData()))}
  />
);

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      createHref: jest.fn(),
      push: jest.fn(),
    }),
  };
});

describe('SourceDestination', () => {
  test('renders correctly against snapshot', () => {
    const { asFragment } = render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);
    expect(asFragment).toMatchSnapshot();
  });

  test('it renders a destination label', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText(i18n.DESTINATION)).toBeInTheDocument();
  });

  test('it renders destination.bytes', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('40B')).toBeInTheDocument();
  });

  test('it renders percent destination.bytes', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);
    const destinationBytes = asArrayIfExists(
      get(DESTINATION_BYTES_FIELD_NAME, getMockNetflowData())
    );
    const sumBytes = asArrayIfExists(get(NETWORK_BYTES_FIELD_NAME, getMockNetflowData()));
    let percent = '';
    if (destinationBytes != null && sumBytes != null) {
      percent = `(${numeral((destinationBytes[0] / sumBytes[0]) * 100).format('0.00')}%)`;
    }

    expect(screen.getByText(percent)).toBeInTheDocument();
  });

  test('it renders destination.geo.continent_name', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-destination.geo.continent_name').textContent).toBe(
      'North America'
    );
  });

  test('it renders destination.geo.country_name', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-destination.geo.country_name').textContent).toBe(
      'United States'
    );
  });

  test('it renders destination.geo.country_iso_code', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-destination.geo.country_iso_code').textContent).toBe(
      'US'
    );
  });

  test('it renders destination.geo.region_name', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-destination.geo.region_name').textContent).toBe(
      'New York'
    );
  });

  test('it renders destination.geo.city_name', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-destination.geo.city_name').textContent).toBe(
      'New York'
    );
  });

  test('it renders the destination ip and port, separated with a colon', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('destination-ip-badge').textContent).toContain('10.1.2.3:80');
  });

  test('it renders destination.packets', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('1 pkts')).toBeInTheDocument();
  });

  test('it hyperlinks links destination.port to an external service that describes the purpose of the port', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      within(screen.getByTestId('destination-ip-group')).getByTestId('port-or-service-name-link')
    ).toHaveAttribute(
      'href',
      'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=80'
    );
  });

  test('it renders network.bytes', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('100B')).toBeInTheDocument();
  });

  test('it renders network.community_id', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('we.live.in.a')).toBeInTheDocument();
  });

  test('it renders network.direction', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('outgoing')).toBeInTheDocument();
  });

  test('it renders network.packets', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('3 pkts')).toBeInTheDocument();
  });

  test('it renders network.protocol', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('http')).toBeInTheDocument();
  });

  test('it renders a source label', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText(i18n.SOURCE)).toBeInTheDocument();
  });

  test('it renders source.bytes', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('60B')).toBeInTheDocument();
  });

  test('it renders percent source.bytes', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);
    const sourceBytes = asArrayIfExists(get(SOURCE_BYTES_FIELD_NAME, getMockNetflowData()));
    const sumBytes = asArrayIfExists(get(NETWORK_BYTES_FIELD_NAME, getMockNetflowData()));
    let percent = '';
    if (sourceBytes != null && sumBytes != null) {
      percent = `(${numeral((sourceBytes[0] / sumBytes[0]) * 100).format('0.00')}%)`;
    }

    expect(screen.getByText(percent)).toBeInTheDocument();
  });

  test('it renders source.geo.continent_name', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-source.geo.continent_name').textContent).toBe(
      'North America'
    );
  });

  test('it renders source.geo.country_name', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-source.geo.country_name').textContent).toBe(
      'United States'
    );
  });

  test('it renders source.geo.country_iso_code', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-source.geo.country_iso_code').textContent).toBe('US');
  });

  test('it renders source.geo.region_name', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-source.geo.region_name').textContent).toBe('Georgia');
  });

  test('it renders source.geo.city_name', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('render-content-source.geo.city_name').textContent).toBe('Atlanta');
  });

  test('it renders the source ip and port, separated with a colon', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByTestId('source-ip-badge').textContent).toContain('192.168.1.2:9987');
  });

  test('it renders source.packets', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('2 pkts')).toBeInTheDocument();
  });

  test('it renders network.transport', () => {
    render(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(screen.getByText('tcp')).toBeInTheDocument();
  });
});
