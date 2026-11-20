/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { mockTimelineData, TestProviders } from '../../../../../../common/mock';
import {
  ZeekSignature,
  extractStateValue,
  constructDroppedValue,
  TotalVirusLinkSha,
  Link,
  ZeekElement,
  sha1StringRenderer,
  md5StringRenderer,
  droppedStringRenderer,
  moduleStringRenderer,
  defaultStringRenderer,
} from './zeek_signature';
import { SecurityCellActions } from '../../../../../../common/components/cell_actions';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('../../../../../../common/components/links', () => ({
  ...jest.requireActual('../../../../../../common/components/links'),
  ReputationLink: ({ domain }: { domain: string }) => (
    <div data-test-subj="reputationLinkSha">{domain}</div>
  ),
}));

jest.mock('../../../../../../common/components/cell_actions', () => {
  return {
    SecurityCellActions: jest.fn(),
    CellActionsMode: {
      HOVER_DOWN: 'hover-down',
      HOVER_RIGHT: 'hover-right',
      INLINE: 'inline',
    },
    SecurityCellActionsTrigger: {
      DEFAULT: 'default',
    },
  };
});

const MockedSecurityCellActions = jest.fn(({ children }) => {
  return <div data-test-subj="mock-security-cell-actions">{children}</div>;
});

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('ZeekSignature', () => {
  let zeek: Ecs;

  beforeEach(() => {
    zeek = cloneDeep(mockTimelineData[13].ecs);
    (SecurityCellActions as unknown as jest.Mock).mockImplementation(MockedSecurityCellActions);
  });

  describe('rendering', () => {
    test('it renders the default Zeek', () => {
      render(
        <TestProviders>
          <ZeekSignature data={zeek} scopeId="test" />
        </TestProviders>
      );
      expect(screen.getAllByTestId('mock-security-cell-actions').length).toBeGreaterThan(0);
    });
  });

  describe('#extractStateValue', () => {
    test('it returns a valid state i18n string given a valid string', () => {
      expect(extractStateValue('S0')).toEqual('Connection attempt seen, no reply');
    });

    test('it returns null given null', () => {
      expect(extractStateValue(null)).toBeNull();
    });

    test('it returns null given an invalid string', () => {
      expect(extractStateValue('garbage')).toBeNull();
    });
  });

  describe('#constructDroppedValue', () => {
    test('it returns a valid Dropped string given a valid boolean of "true"', () => {
      expect(constructDroppedValue(true)).toEqual('true');
    });

    test('it returns a valid Dropped string given a valid boolean of "false"', () => {
      expect(constructDroppedValue(false)).toEqual('false');
    });

    test('it returns null given null', () => {
      expect(constructDroppedValue(null)).toEqual(null);
    });
  });

  describe('#TotalVirusLinkSha', () => {
    test('should return null if value is null', () => {
      const { container } = render(<TotalVirusLinkSha value={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    test('should render', () => {
      render(
        <TestProviders>
          <TotalVirusLinkSha value={'abc'} />
        </TestProviders>
      );
      expect(screen.getByTestId('reputationLinkSha')).toHaveTextContent('abc');
    });
  });

  describe('#Link', () => {
    test('should return null if value is null', () => {
      const { container } = render(<Link value={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    test('should render value', () => {
      const { container } = render(<Link value={'abc'} />);
      const extractEuiIconText = removeExternalLinkText(container.textContent).replaceAll(
        'External link',
        ''
      );
      expect(extractEuiIconText).toEqual('abc');
    });

    test('should render value and link', () => {
      render(<Link value={'abcdefg'} link={'somethingelse'} />);
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        'https://www.google.com/search?q=somethingelse'
      );
    });
  });

  describe('ZeekElement', () => {
    beforeEach(() => {
      (SecurityCellActions as unknown as jest.Mock).mockImplementation(MockedSecurityCellActions);
    });

    test('it returns null if value is null', () => {
      const { container } = render(
        <TestProviders>
          <ZeekElement scopeId="some_scope" field="zeek.notice" value={null} />
        </TestProviders>
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it renders the default ZeekSignature', () => {
      const { container } = render(
        <TestProviders>
          <ZeekElement field="zeek.notice" value={'mynote'} scopeId="test" />
        </TestProviders>
      );
      expect(container.textContent).toEqual('mynote');
    });

    test('it renders with a custom string renderer', () => {
      const { container } = render(
        <TestProviders>
          <ZeekElement
            scopeId="some_scope"
            field="zeek.notice"
            value={'mynote'}
            stringRenderer={(value) => `->${value}<-`}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('->mynote<-');
    });

    test('should passing correct scopeId to cell actions', () => {
      render(
        <TestProviders>
          <ZeekElement scopeId="some_scope" field="zeek.notice" value={'mynote'} />
        </TestProviders>
      );

      expect(MockedSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            scopeId: 'some_scope',
          }),
        }),
        {}
      );
    });

    describe('#TagTooltip', () => {
      test('it passes the name of the field to the cell actions', () => {
        const field = 'zeek.notice';
        render(
          <TestProviders>
            <ZeekElement scopeId="some_scope" field={field} value={'the people you love'} />
          </TestProviders>
        );

        expect(MockedSecurityCellActions).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ field }) }),
          {}
        );
        expect(screen.getByText('the people you love')).toBeInTheDocument();
      });
    });
  });

  describe('#sha1StringRenderer', () => {
    test('renders first 7 characters of a sha', () => {
      expect(sha1StringRenderer('12345678910')).toEqual('sha1: 1234567...');
    });

    test('renders less than 7 characters if for some reason there is bad input', () => {
      expect(sha1StringRenderer('123')).toEqual('sha1: 123...');
    });
  });

  describe('#md5StringRenderer', () => {
    test('renders first 7 characters of a md5', () => {
      expect(md5StringRenderer('12345678910')).toEqual('md5: 1234567...');
    });

    test('renders less than 7 characters if for some reason there is bad input', () => {
      expect(md5StringRenderer('123')).toEqual('md5: 123...');
    });
  });

  describe('#droppedStringRenderer', () => {
    test('renders the words Dropped:someValue', () => {
      expect(droppedStringRenderer('someValue')).toEqual('Dropped:someValue');
    });
  });

  describe('#moduleStringRenderer', () => {
    test('renders modules of zeek.connection as the string connection', () => {
      expect(moduleStringRenderer('zeek.connection')).toEqual('connection');
    });

    test('renders modules of zeek.dns as the string dns', () => {
      expect(moduleStringRenderer('zeek.dns')).toEqual('dns');
    });

    test('renders modules of zeek.http as the string http', () => {
      expect(moduleStringRenderer('zeek.http')).toEqual('http');
    });

    test('renders modules of zeek.files as the string files', () => {
      expect(moduleStringRenderer('zeek.files')).toEqual('files');
    });

    test('renders modules of zeek.notice as the string notice', () => {
      expect(moduleStringRenderer('zeek.notice')).toEqual('notice');
    });

    test('renders modules of zeek.ssl as the string ssl', () => {
      expect(moduleStringRenderer('zeek.ssl')).toEqual('ssl');
    });

    test('renders modules of bad input as that module name', () => {
      expect(moduleStringRenderer('ssl')).toEqual('ssl');
    });

    test('renders modules of bad input with multiple dots as only the second value', () => {
      expect(moduleStringRenderer('abc.def.ghi')).toEqual('def');
    });

    test('renders modules of bad input with single dot as that value (but with the dot)', () => {
      expect(moduleStringRenderer('abc.')).toEqual('abc');
    });
  });

  describe('#defaultStringRenderer', () => {
    test('renders default string', () => {
      expect(defaultStringRenderer('identity')).toEqual('identity');
    });
  });
});
