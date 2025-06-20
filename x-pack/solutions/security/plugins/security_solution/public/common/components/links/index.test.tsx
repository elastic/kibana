/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { encodeIpv6 } from '../../lib/helpers';
import {
  GoogleLink,
  HostDetailsLink,
  NetworkDetailsLink,
  ReputationLink,
  WhoIsLink,
  CertificateFingerprintLink,
  Ja3FingerprintLink,
  PortOrServiceNameLink,
  DEFAULT_NUMBER_OF_LINK,
  ExternalLink,
  SecuritySolutionLinkButton,
  CaseDetailsLink,
} from '.';
import { SecurityPageName } from '../../../app/types';
import { mockGetAppUrl, mockNavigateTo } from '@kbn/security-solution-navigation/mocks/navigation';
import { APP_UI_ID } from '../../../../common';
import { TestProviders } from '../../mock';

jest.mock('@kbn/security-solution-navigation/src/navigation');
jest.mock('../navigation/use_url_state_query_params');
jest.mock('../../../overview/components/events_by_dataset');

const mockNavigateToApp = jest.fn();
const mockUseUiSetting$ = jest.fn();
jest.mock('../../lib/kibana', () => {
  const original = jest.requireActual('../../lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          navigateToApp: mockNavigateToApp,
        },
      },
    }),
    useUiSetting$: () => mockUseUiSetting$(),
  };
});

mockGetAppUrl.mockImplementation(({ path }) => path);

describe('Custom Links', () => {
  const hostName = 'Host Name';
  const ipv4 = '192.0.2.255';
  const ipv4a = '192.0.2.266';
  const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
  const ipv6Encoded = encodeIpv6(ipv6);

  describe('HostDetailsLink', () => {
    test('should render valid link to Host Details with hostName as the display text', () => {
      render(
        <TestProviders>
          <HostDetailsLink hostName={hostName} />
        </TestProviders>
      );
      const link = screen.getByTestId('host-details-button');
      expect(link).toHaveAttribute('href', `/name/${encodeURIComponent(hostName)}`);
      expect(link).toHaveTextContent(hostName);
    });

    test('should render valid link to Host Details with child text as the display text', () => {
      render(
        <TestProviders>
          <HostDetailsLink hostName={hostName}>{hostName}</HostDetailsLink>
        </TestProviders>
      );
      const link = screen.getByTestId('host-details-button');
      expect(link).toHaveAttribute('href', `/name/${encodeURIComponent(hostName)}`);
      expect(link).toHaveTextContent(hostName);
    });
  });

  describe('NetworkDetailsLink', () => {
    test('can handle array of ips', () => {
      const { container } = render(
        <TestProviders>
          <NetworkDetailsLink ip={[ipv4, ipv4a]} />
        </TestProviders>
      );
      const links = screen.getAllByTestId('network-details');
      expect(links[0]).toHaveAttribute('href', `/ip/${encodeURIComponent(ipv4)}/source/events`);
      expect(links[1]).toHaveAttribute('href', `/ip/${encodeURIComponent(ipv4a)}/source/events`);

      expect(container).toHaveTextContent(`${ipv4}, ${ipv4a}`);
    });

    test('can handle a string array of ips', () => {
      const { container } = render(
        <TestProviders>
          <NetworkDetailsLink ip={`${ipv4},   ${ipv4a}`} />
        </TestProviders>
      );
      const links = screen.getAllByTestId('network-details');
      expect(links[0]).toHaveAttribute('href', `/ip/${encodeURIComponent(ipv4)}/source/events`);
      expect(links[1]).toHaveAttribute('href', `/ip/${encodeURIComponent(ipv4a)}/source/events`);
      expect(container).toHaveTextContent(`${ipv4}, ${ipv4a}`);
    });

    test('should render valid link to IP Details with ipv4 as the display text', () => {
      render(
        <TestProviders>
          <NetworkDetailsLink ip={ipv4} />
        </TestProviders>
      );
      const link = screen.getByTestId('network-details');
      expect(link).toHaveAttribute('href', `/ip/${encodeURIComponent(ipv4)}/source/events`);
      expect(link).toHaveTextContent(ipv4);
    });

    test('should render valid link to IP Details with child text as the display text', () => {
      render(
        <TestProviders>
          <NetworkDetailsLink ip={ipv4}>{hostName}</NetworkDetailsLink>
        </TestProviders>
      );
      const link = screen.getByTestId('network-details');
      expect(link).toHaveAttribute('href', `/ip/${encodeURIComponent(ipv4)}/source/events`);
      expect(link).toHaveTextContent(hostName);
    });

    test('should render valid link to IP Details with ipv6 as the display text', () => {
      render(
        <TestProviders>
          <NetworkDetailsLink ip={ipv6} />
        </TestProviders>
      );
      const link = screen.getByTestId('network-details');
      expect(link).toHaveAttribute('href', `/ip/${encodeURIComponent(ipv6Encoded)}/source/events`);
      expect(link).toHaveTextContent(ipv6);
    });
  });

  describe('CaseDetailsLink', () => {
    test('should render a link with detailName as displayed text', () => {
      render(
        <TestProviders>
          <CaseDetailsLink detailName="name" />
        </TestProviders>
      );
      const link = screen.getByTestId('case-details-link');
      expect(link).toHaveTextContent('name');
      expect(link).toHaveAttribute('aria-label', 'click to visit case with title name');
      expect(link).toHaveAttribute('href', '/name');
    });

    test('should render a link with children instead of detailName', () => {
      render(
        <TestProviders>
          <CaseDetailsLink detailName="name">
            <div>{'children'}</div>
          </CaseDetailsLink>
        </TestProviders>
      );
      const link = screen.getByTestId('case-details-link');
      expect(link).toHaveTextContent('children');
    });

    test('should render a link with aria-label using title prop instead of detailName', () => {
      render(
        <TestProviders>
          <CaseDetailsLink detailName="name" title="title" />
        </TestProviders>
      );
      const link = screen.getByTestId('case-details-link');
      expect(link).toHaveAttribute('aria-label', 'click to visit case with title title');
    });

    it('should call navigateToApp with correct values', async () => {
      render(
        <TestProviders>
          <CaseDetailsLink detailName="name" />
        </TestProviders>
      );
      const link = screen.getByTestId('case-details-link');
      await userEvent.click(link);

      expect(mockNavigateToApp).toHaveBeenCalledWith(APP_UI_ID, {
        deepLinkId: SecurityPageName.case,
        path: '/name',
        openInNewTab: false,
      });
    });

    it('should call navigateToApp with value of openInNewTab prop', async () => {
      render(
        <TestProviders>
          <CaseDetailsLink detailName="name" openInNewTab={true} />
        </TestProviders>
      );
      const link = screen.getByTestId('case-details-link');
      await userEvent.click(link);

      expect(mockNavigateToApp).toHaveBeenCalledWith(APP_UI_ID, {
        deepLinkId: SecurityPageName.case,
        path: '/name',
        openInNewTab: true,
      });
    });
  });

  describe('GoogleLink', () => {
    test('it renders text passed in as value', () => {
      render(
        <TestProviders>
          <GoogleLink link={'http://example.com/'}>{'Example Link'}</GoogleLink>
        </TestProviders>
      );
      const link = screen.getByTestId('externalLink');
      expect(removeExternalLinkText(link.textContent || '')).toContain('Example Link');
    });

    test('it renders props passed in as link', () => {
      render(
        <TestProviders>
          <GoogleLink link={'http://example.com/'}>{'Example Link'}</GoogleLink>
        </TestProviders>
      );
      const link = screen.getByTestId('externalLink');
      expect(link).toHaveAttribute(
        'href',
        'https://www.google.com/search?q=http%3A%2F%2Fexample.com%2F'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      render(
        <TestProviders>
          <GoogleLink link={"http://example.com?q=<script>alert('XSS')</script>"}>
            {'Example Link'}
          </GoogleLink>
        </TestProviders>
      );
      const link = screen.getByTestId('externalLink');
      expect(link).toHaveAttribute(
        'href',
        "https://www.google.com/search?q=http%3A%2F%2Fexample.com%3Fq%3D%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('External Link', () => {
    const mockLink = 'https://www.virustotal.com/gui/search/';
    const mockLinkName = 'Link';

    describe('render', () => {
      test('it renders tooltip', async () => {
        render(
          <TestProviders>
            <ExternalLink url={mockLink} idx={0} allItemsLimit={5} overflowIndexStart={5}>
              {mockLinkName}
            </ExternalLink>
          </TestProviders>
        );
        const link = screen.getByTestId('externalLink');
        expect(link).toBeInTheDocument();
        userEvent.hover(link);

        expect(await screen.findByTestId('externalLinkTooltip')).toBeInTheDocument();
      });

      test('it renders ExternalLinkIcon', () => {
        const { container } = render(
          <TestProviders>
            <ExternalLink url={mockLink} idx={0} allItemsLimit={5} overflowIndexStart={5}>
              {mockLinkName}
            </ExternalLink>
          </TestProviders>
        );
        expect(container.querySelector('span [data-euiicon-type="popout"]')).toBeInTheDocument();
      });

      test('it renders correct url', () => {
        render(
          <TestProviders>
            <ExternalLink url={mockLink} idx={0} allItemsLimit={5} overflowIndexStart={5}>
              {mockLinkName}
            </ExternalLink>
          </TestProviders>
        );
        const link = screen.getByTestId('externalLink');
        expect(link).toHaveAttribute('href', mockLink);
      });

      test('it renders comma if id is given', () => {
        render(
          <TestProviders>
            <ExternalLink url={mockLink} idx={0} allItemsLimit={5} overflowIndexStart={5}>
              {mockLinkName}
            </ExternalLink>
          </TestProviders>
        );
        expect(screen.getByTestId('externalLinkComma')).toBeInTheDocument();
      });
    });

    describe('not render', () => {
      test('it should not render if childen prop is not given', () => {
        render(
          <TestProviders>
            <ExternalLink url={mockLink} idx={4} allItemsLimit={5} overflowIndexStart={5} />
          </TestProviders>
        );
        expect(screen.queryByTestId('externalLinkTooltip')).not.toBeInTheDocument();
      });

      test('it should not render if url prop is not given', () => {
        render(
          <TestProviders>
            <ExternalLink url={''} idx={4} allItemsLimit={5} overflowIndexStart={5} />
          </TestProviders>
        );
        expect(screen.queryByTestId('externalLinkTooltip')).not.toBeInTheDocument();
      });

      test('it should not render if url prop is invalid', () => {
        render(
          <TestProviders>
            <ExternalLink url={'xxx'} idx={4} allItemsLimit={5} overflowIndexStart={5} />
          </TestProviders>
        );
        expect(screen.queryByTestId('externalLinkTooltip')).not.toBeInTheDocument();
      });

      test('it should not render comma if id is not given', () => {
        render(
          <TestProviders>
            <ExternalLink url={mockLink} allItemsLimit={5} overflowIndexStart={5}>
              {mockLinkName}
            </ExternalLink>
          </TestProviders>
        );
        expect(screen.queryByTestId('externalLinkComma')).not.toBeInTheDocument();
      });

      test('it should not render comma for the last item', () => {
        render(
          <TestProviders>
            <ExternalLink url={mockLink} idx={4} allItemsLimit={5} overflowIndexStart={5}>
              {mockLinkName}
            </ExternalLink>
          </TestProviders>
        );
        expect(screen.queryByTestId('externalLinkComma')).not.toBeInTheDocument();
      });
    });

    describe.each<[number, number, number, boolean]>([
      [0, 2, 5, true],
      [1, 2, 5, false],
      [2, 2, 5, false],
      [3, 2, 5, false],
      [4, 2, 5, false],
      [5, 2, 5, false],
    ])(
      'renders Comma when overflowIndex is smaller than allItems limit',
      (idx, overflowIndexStart, allItemsLimit, showComma) => {
        test(`should render Comma if current id (${idx}) is smaller than the index of last visible item`, () => {
          render(
            <TestProviders>
              <ExternalLink
                url={mockLink}
                idx={idx}
                allItemsLimit={allItemsLimit}
                overflowIndexStart={overflowIndexStart}
              >
                {mockLinkName}
              </ExternalLink>
            </TestProviders>
          );
          if (showComma) {
            expect(screen.getByTestId('externalLinkComma')).toBeInTheDocument();
          } else {
            expect(screen.queryByTestId('externalLinkComma')).not.toBeInTheDocument();
          }
        });
      }
    );

    describe.each<[number, number, number, boolean]>([
      [0, 5, 4, true],
      [1, 5, 4, true],
      [2, 5, 4, true],
      [3, 5, 4, false],
      [4, 5, 4, false],
      [5, 5, 4, false],
    ])(
      'When overflowIndex is grater than allItems limit',
      (idx, overflowIndexStart, allItemsLimit, showComma) => {
        test(`Current item (${idx}) should render Comma execpt the last item`, () => {
          render(
            <TestProviders>
              <ExternalLink
                url={mockLink}
                idx={idx}
                allItemsLimit={allItemsLimit}
                overflowIndexStart={overflowIndexStart}
              >
                {mockLinkName}
              </ExternalLink>
            </TestProviders>
          );
          if (showComma) {
            expect(screen.getByTestId('externalLinkComma')).toBeInTheDocument();
          } else {
            expect(screen.queryByTestId('externalLinkComma')).not.toBeInTheDocument();
          }
        });
      }
    );

    describe.each<[number, number, number, boolean]>([
      [0, 5, 5, true],
      [1, 5, 5, true],
      [2, 5, 5, true],
      [3, 5, 5, true],
      [4, 5, 5, false],
      [5, 5, 5, false],
    ])(
      'when overflowIndex equals to allItems limit',
      (idx, overflowIndexStart, allItemsLimit, showComma) => {
        test(`Current item (${idx}) should render Comma correctly`, () => {
          render(
            <TestProviders>
              <ExternalLink
                url={mockLink}
                idx={idx}
                allItemsLimit={allItemsLimit}
                overflowIndexStart={overflowIndexStart}
              >
                {mockLinkName}
              </ExternalLink>
            </TestProviders>
          );
          if (showComma) {
            expect(screen.getByTestId('externalLinkComma')).toBeInTheDocument();
          } else {
            expect(screen.queryByTestId('externalLinkComma')).not.toBeInTheDocument();
          }
        });
      }
    );
  });

  describe('ReputationLink', () => {
    const mockCustomizedReputationLinks = [
      { name: 'Link 1', url_template: 'https://www.virustotal.com/gui/search/{{ip}}' },
      {
        name: 'Link 2',
        url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}',
      },
      { name: 'Link 3', url_template: 'https://www.virustotal.com/gui/search/{{ip}}' },
      {
        name: 'Link 4',
        url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}',
      },
      { name: 'Link 5', url_template: 'https://www.virustotal.com/gui/search/{{ip}}' },
      {
        name: 'Link 6',
        url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}',
      },
    ];
    const mockDefaultReputationLinks = mockCustomizedReputationLinks.slice(0, 2);

    describe('links property', () => {
      beforeEach(() => {
        mockUseUiSetting$.mockReturnValue([mockDefaultReputationLinks]);
      });

      test('it renders default link text', () => {
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} />
          </TestProviders>
        );
        const links = screen.getAllByTestId('externalLink');
        links.forEach((link, idx) => {
          expect(link).toHaveTextContent(mockDefaultReputationLinks[idx].name);
        });
      });

      test('it renders customized link text', () => {
        mockUseUiSetting$.mockReturnValue([mockCustomizedReputationLinks]);
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} />
          </TestProviders>
        );
        const links = screen.getAllByTestId('externalLink');
        links.forEach((link, idx) => {
          expect(link).toHaveTextContent(mockCustomizedReputationLinks[idx].name);
        });
      });

      test('it renders correct href', () => {
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} />
          </TestProviders>
        );
        const links = screen.getAllByTestId('externalLink');
        links.forEach((link, idx) => {
          expect(link).toHaveAttribute(
            'href',
            mockDefaultReputationLinks[idx].url_template.replace('{{ip}}', '192.0.2.0')
          );
        });
      });
    });

    describe('number of links', () => {
      beforeAll(() => {
        mockUseUiSetting$.mockReturnValue([mockCustomizedReputationLinks]);
      });

      test('it renders correct number of links by default', () => {
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} />
          </TestProviders>
        );
        expect(screen.getAllByTestId('externalLink')).toHaveLength(DEFAULT_NUMBER_OF_LINK);
      });

      test('it renders correct number of tooltips by default', async () => {
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} />
          </TestProviders>
        );

        const links = screen.getAllByTestId('externalLink');
        for (const link of links) {
          const key = links.indexOf(link);
          userEvent.hover(link);
          await waitFor(() => {
            expect(screen.getByTestId('externalLinkTooltip')).toHaveTextContent(
              mockCustomizedReputationLinks[key].url_template.replace('{{ip}}', '192.0.2.0')
            );
          });
        }
      });

      test('it renders correct number of visible link', () => {
        mockUseUiSetting$.mockReturnValue([mockCustomizedReputationLinks]);
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
          </TestProviders>
        );
        expect(screen.getAllByTestId('externalLink')).toHaveLength(1);
      });
    });

    describe('invalid customized links', () => {
      const mockInvalidLinksEmptyObj = [{}];
      const mockInvalidLinksNoName = [
        { url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}' },
      ];
      const mockInvalidLinksNoUrl = [{ name: 'Link 1' }];
      const mockInvalidUrl = [{ name: 'Link 1', url_template: "<script>alert('XSS')</script>" }];

      test('it filters empty object', () => {
        mockUseUiSetting$.mockReturnValue([mockInvalidLinksEmptyObj]);
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
          </TestProviders>
        );
        expect(screen.queryByTestId('externalLink')).not.toBeInTheDocument();
      });

      test('it filters object without name property', () => {
        mockUseUiSetting$.mockReturnValue([mockInvalidLinksNoName]);
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
          </TestProviders>
        );
        expect(screen.queryByTestId('externalLink')).not.toBeInTheDocument();
      });

      test('it filters object without url_template property', () => {
        mockUseUiSetting$.mockReturnValue([mockInvalidLinksNoUrl]);
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
          </TestProviders>
        );
        expect(screen.queryByTestId('externalLink')).not.toBeInTheDocument();
      });

      test('it filters object with invalid url', () => {
        mockUseUiSetting$.mockReturnValue([mockInvalidUrl]);
        render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
          </TestProviders>
        );
        expect(screen.queryByTestId('externalLink')).not.toBeInTheDocument();
      });
    });

    describe('external icon', () => {
      beforeAll(() => {
        mockUseUiSetting$.mockReturnValue([mockCustomizedReputationLinks]);
      });

      test('it renders correct number of external icons by default', () => {
        const { container } = render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} />
          </TestProviders>
        );
        expect(container.querySelectorAll('span [data-euiicon-type="popout"]')).toHaveLength(5);
      });

      test('it renders correct number of external icons', () => {
        const { container } = render(
          <TestProviders>
            <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
          </TestProviders>
        );
        expect(container.querySelectorAll('span [data-euiicon-type="popout"]')).toHaveLength(1);
      });
    });
  });

  describe('WhoisLink', () => {
    test('it renders ip passed in as domain', () => {
      render(
        <TestProviders>
          <WhoIsLink domain={'192.0.2.0'}>{'Example Link'}</WhoIsLink>
        </TestProviders>
      );
      const link = screen.getByTestId('externalLink');
      expect(removeExternalLinkText(link.textContent || '')).toContain('Example Link');
    });

    test('it renders correct href', () => {
      render(
        <TestProviders>
          <WhoIsLink domain={'192.0.2.0'}>{'Example Link'} </WhoIsLink>
        </TestProviders>
      );
      const link = screen.getByTestId('externalLink');
      expect(link).toHaveAttribute('href', 'https://www.iana.org/whois?q=192.0.2.0');
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      render(
        <TestProviders>
          <WhoIsLink domain={"<script>alert('XSS')</script>"}>{'Example Link'}</WhoIsLink>
        </TestProviders>
      );
      const link = screen.getByTestId('externalLink');
      expect(link).toHaveAttribute(
        'href',
        "https://www.iana.org/whois?q=%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('CertificateFingerprintLink', () => {
    test('it renders link text', () => {
      render(
        <TestProviders>
          <CertificateFingerprintLink certificateFingerprint={'abcd'}>
            {'Example Link'}
          </CertificateFingerprintLink>
        </TestProviders>
      );
      const link = screen.getByTestId('certificate-fingerprint-link');
      expect(removeExternalLinkText(link.textContent || '')).toContain('Example Link');
    });

    test('it renders correct href', () => {
      render(
        <TestProviders>
          <CertificateFingerprintLink certificateFingerprint={'abcd'}>
            {'Example Link'}
          </CertificateFingerprintLink>
        </TestProviders>
      );
      const link = screen.getByTestId('certificate-fingerprint-link');
      expect(link).toHaveAttribute('href', 'https://sslbl.abuse.ch/ssl-certificates/sha1/abcd');
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      render(
        <TestProviders>
          <CertificateFingerprintLink certificateFingerprint={"<script>alert('XSS')</script>"}>
            {'Example Link'}
          </CertificateFingerprintLink>
        </TestProviders>
      );
      const link = screen.getByTestId('certificate-fingerprint-link');
      expect(link).toHaveAttribute(
        'href',
        "https://sslbl.abuse.ch/ssl-certificates/sha1/%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('Ja3FingerprintLink', () => {
    test('it renders link text', () => {
      render(
        <TestProviders>
          <Ja3FingerprintLink ja3Fingerprint={'abcd'}>{'Example Link'}</Ja3FingerprintLink>
        </TestProviders>
      );
      const link = screen.getByTestId('ja3-fingerprint-link');
      expect(removeExternalLinkText(link.textContent || '')).toContain('Example Link');
    });

    test('it renders correct href', () => {
      render(
        <TestProviders>
          <Ja3FingerprintLink ja3Fingerprint={'abcd'}>{'Example Link'}</Ja3FingerprintLink>
        </TestProviders>
      );
      const link = screen.getByTestId('ja3-fingerprint-link');
      expect(link).toHaveAttribute('href', 'https://sslbl.abuse.ch/ja3-fingerprints/abcd');
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      render(
        <TestProviders>
          <Ja3FingerprintLink ja3Fingerprint={"<script>alert('XSS')</script>"}>
            {'Example Link'}
          </Ja3FingerprintLink>
        </TestProviders>
      );
      const link = screen.getByTestId('ja3-fingerprint-link');
      expect(link).toHaveAttribute(
        'href',
        "https://sslbl.abuse.ch/ja3-fingerprints/%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('PortOrServiceNameLink', () => {
    test('it renders link text', () => {
      render(
        <TestProviders>
          <PortOrServiceNameLink portOrServiceName={443}>{'Example Link'}</PortOrServiceNameLink>
        </TestProviders>
      );
      const link = screen.getByTestId('port-or-service-name-link');
      expect(removeExternalLinkText(link.textContent || '')).toContain('Example Link');
    });

    test('it renders correct href when port is a number', () => {
      render(
        <TestProviders>
          <PortOrServiceNameLink portOrServiceName={443}>{'Example Link'}</PortOrServiceNameLink>
        </TestProviders>
      );
      const link = screen.getByTestId('port-or-service-name-link');
      expect(link).toHaveAttribute(
        'href',
        'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=443'
      );
    });

    test('it renders correct href when port is a string', () => {
      render(
        <TestProviders>
          <PortOrServiceNameLink portOrServiceName={'80'}>{'Example Link'}</PortOrServiceNameLink>
        </TestProviders>
      );
      const link = screen.getByTestId('port-or-service-name-link');
      expect(link).toHaveAttribute(
        'href',
        'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=80'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      render(
        <TestProviders>
          <PortOrServiceNameLink portOrServiceName={"<script>alert('XSS')</script>"}>
            {'Example Link'}
          </PortOrServiceNameLink>
        </TestProviders>
      );
      const link = screen.getByTestId('port-or-service-name-link');
      expect(link).toHaveAttribute(
        'href',
        "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('SecuritySolutionLinkButton', () => {
    it('injects href prop with hosts page path', () => {
      const path = 'testTabPath';
      const { container } = render(
        <TestProviders>
          <SecuritySolutionLinkButton deepLinkId={SecurityPageName.hosts} path={path} />
        </TestProviders>
      );
      const link = container.querySelector('a.euiButton');
      expect(link).toHaveAttribute('href', path);
    });

    it('injects onClick prop that calls navigateTo', async () => {
      const path = 'testTabPath';
      const { container } = render(
        <TestProviders>
          <SecuritySolutionLinkButton deepLinkId={SecurityPageName.hosts} path={path} />
        </TestProviders>
      );
      const link = container.querySelector('a.euiButton');
      await userEvent.click(link!);

      expect(mockNavigateTo).toHaveBeenLastCalledWith({ url: path });
    });
  });
});
