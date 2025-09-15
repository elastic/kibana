/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FLYOUT_LINK_TEST_ID, FLYOUT_PREVIEW_LINK_TEST_ID } from './test_ids';
import { FlyoutLink } from './flyout_link';
import { TestProviders } from '../../../common/mock';
import { mockFlyoutApi } from '../../document_details/shared/mocks/mock_flyout_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { HostPanelKey, UserPanelKey } from '../../entity_details/shared/constants';
import { NetworkPanelKey } from '../../network_details';
import { RulePanelKey } from '../../rule_details/right';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { useWhichFlyout } from '../../document_details/shared/hooks/use_which_flyout';
import { TableId } from '@kbn/securitysolution-data-table';

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

jest.mock('../../document_details/shared/hooks/use_which_flyout', () => ({
  useWhichFlyout: jest.fn(),
}));

const renderFlyoutLink = (
  field: string,
  value: string,
  dataTestSuj?: string,
  isFlyoutOpen?: boolean
) =>
  render(
    <TestProviders>
      <FlyoutLink
        field={field}
        value={value}
        data-test-subj={dataTestSuj}
        scopeId={'scopeId'}
        ruleId={'ruleId'}
        isFlyoutOpen={isFlyoutOpen}
      />
    </TestProviders>
  );

describe('<FlyoutLink />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  describe('when flyout is currently open', () => {
    it('should render a preview link if isFlyoutOpen is true', () => {
      const { getByTestId } = renderFlyoutLink('host.name', 'host', undefined, true);

      expect(getByTestId(FLYOUT_PREVIEW_LINK_TEST_ID)).toBeInTheDocument();

      getByTestId(FLYOUT_PREVIEW_LINK_TEST_ID).click();
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalled();
    });

    it('should render a preview link if useWhichFlyout is not null', () => {
      jest.mocked(useWhichFlyout).mockReturnValue('flyout');
      const { getByTestId } = renderFlyoutLink('user.name', 'user', undefined, false);

      expect(getByTestId(FLYOUT_PREVIEW_LINK_TEST_ID)).toBeInTheDocument();

      getByTestId(FLYOUT_PREVIEW_LINK_TEST_ID).click();
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalled();
    });
  });

  describe('when flyout is not currently open', () => {
    beforeEach(() => {
      jest.mocked(useWhichFlyout).mockReturnValue(null);
    });

    it('should not render a link if field does not have flyout', () => {
      const { queryByTestId } = renderFlyoutLink('field', 'value');
      expect(queryByTestId(FLYOUT_LINK_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render children without link if field does not have flyout', () => {
      const { queryByTestId, getByTestId } = render(
        <TestProviders>
          <FlyoutLink field={'field'} value={'value'} scopeId={'scopeId'}>
            <div data-test-subj="children">{'children'}</div>
          </FlyoutLink>
        </TestProviders>
      );

      expect(queryByTestId(FLYOUT_LINK_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId('children')).toBeInTheDocument();
    });

    it('should render a link to open host flyout', () => {
      const { getByTestId } = renderFlyoutLink('host.name', 'host', 'host-link');
      getByTestId('host-link').click();

      expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
        right: {
          id: HostPanelKey,
          params: {
            hostName: 'host',
            scopeId: 'scopeId',
          },
        },
      });
    });

    it('should render a link to open user flyout', () => {
      const { getByTestId } = renderFlyoutLink('user.name', 'user', 'user-link');
      getByTestId('user-link').click();

      expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
        right: {
          id: UserPanelKey,
          params: {
            userName: 'user',
            scopeId: 'scopeId',
          },
        },
      });
    });

    it('should render a link to open network flyout', () => {
      const { getByTestId } = renderFlyoutLink('source.ip', '100:XXX:XXX', 'ip-link');
      getByTestId('ip-link').click();

      expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
        right: {
          id: NetworkPanelKey,
          params: {
            ip: '100:XXX:XXX',
            flowTarget: 'source',
            scopeId: 'scopeId',
          },
        },
      });
    });

    it('should render a link to open rule flyout', () => {
      const { getByTestId } = renderFlyoutLink('kibana.alert.rule.name', 'ruleId', 'rule-link');
      getByTestId('rule-link').click();

      expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
        right: {
          id: RulePanelKey,
          params: {
            ruleId: 'ruleId',
          },
        },
      });
    });

    it('should not render a link when ruleId is not provided', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <FlyoutLink
            field={'kibana.alert.rule.name'}
            value={'rule'}
            data-test-subj={'rule-link'}
            scopeId={'scopeId'}
          />
        </TestProviders>
      );
      expect(queryByTestId('rule-link')).not.toBeInTheDocument();
    });

    it('should not render a link when rule name is rendered in rule preview', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <FlyoutLink
            field={'kibana.alert.rule.name'}
            value={'rule'}
            data-test-subj={'rule-link'}
            scopeId={TableId.rulePreview}
          />
        </TestProviders>
      );
      expect(queryByTestId('rule-link')).not.toBeInTheDocument();
    });
  });
});
