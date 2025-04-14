/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FLYOUT_PREVIEW_LINK_TEST_ID } from './test_ids';
import { PreviewLink, hasPreview } from './preview_link';
import { TestProviders } from '../../../common/mock';
import { mockFlyoutApi } from '../../document_details/shared/mocks/mock_flyout_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { HostPreviewPanelKey } from '../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from '../../document_details/right/components/host_entity_overview';
import { UserPreviewPanelKey } from '../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from '../../document_details/right/components/user_entity_overview';
import { NetworkPreviewPanelKey, NETWORK_PREVIEW_BANNER } from '../../network_details';
import { RulePreviewPanelKey, RULE_PREVIEW_BANNER } from '../../rule_details/right';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';

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

const renderPreviewLink = (field: string, value: string, dataTestSuj?: string) =>
  render(
    <TestProviders>
      <PreviewLink
        field={field}
        value={value}
        data-test-subj={dataTestSuj}
        scopeId={'scopeId'}
        ruleId={'ruleId'}
      />
    </TestProviders>
  );

describe('<PreviewLink />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('should not render a link if field does not have preview', () => {
    const { queryByTestId } = renderPreviewLink('field', 'value');
    expect(queryByTestId(FLYOUT_PREVIEW_LINK_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render children without link if field does not have preview', () => {
    const { queryByTestId, getByTestId } = render(
      <TestProviders>
        <PreviewLink field={'field'} value={'value'} scopeId={'scopeId'}>
          <div data-test-subj="children">{'children'}</div>
        </PreviewLink>
      </TestProviders>
    );

    expect(queryByTestId(FLYOUT_PREVIEW_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId('children')).toBeInTheDocument();
  });

  it('should render a link to open host preview', () => {
    const { getByTestId } = renderPreviewLink('host.name', 'host', 'host-link');
    getByTestId('host-link').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: HostPreviewPanelKey,
      params: {
        hostName: 'host',
        scopeId: 'scopeId',
        banner: HOST_PREVIEW_BANNER,
      },
    });
  });

  it('should render a link to open user preview', () => {
    const { getByTestId } = renderPreviewLink('user.name', 'user', 'user-link');
    getByTestId('user-link').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: UserPreviewPanelKey,
      params: {
        userName: 'user',
        scopeId: 'scopeId',
        banner: USER_PREVIEW_BANNER,
      },
    });
  });

  it('should render a link to open network preview', () => {
    const { getByTestId } = renderPreviewLink('source.ip', '100:XXX:XXX', 'ip-link');
    getByTestId('ip-link').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: NetworkPreviewPanelKey,
      params: {
        ip: '100:XXX:XXX',
        flowTarget: 'source',
        scopeId: 'scopeId',
        banner: NETWORK_PREVIEW_BANNER,
      },
    });
  });

  it('should render a link to open rule preview', () => {
    const { getByTestId } = renderPreviewLink('kibana.alert.rule.name', 'ruleId', 'rule-link');
    getByTestId('rule-link').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: RulePreviewPanelKey,
      params: {
        ruleId: 'ruleId',
        banner: RULE_PREVIEW_BANNER,
        isPreviewMode: true,
      },
    });
  });

  it('should not render a link when ruleId is not provided', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <PreviewLink
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
        <PreviewLink
          field={'kibana.alert.rule.name'}
          value={'rule'}
          data-test-subj={'rule-link'}
          scopeId={'scopeId'}
          isPreview={true}
        />
      </TestProviders>
    );
    expect(queryByTestId('rule-link')).not.toBeInTheDocument();
  });
});

describe('hasPreview', () => {
  it('should return true if field is host.name', () => {
    expect(hasPreview('host.name')).toBe(true);
  });

  it('should return true if field is user.name', () => {
    expect(hasPreview('user.name')).toBe(true);
  });

  it('should return true if field is rule.id', () => {
    expect(hasPreview('kibana.alert.rule.name')).toBe(true);
  });

  it('should return true if field type is source.ip', () => {
    expect(hasPreview('source.ip')).toBe(true);
    expect(hasPreview('destination.ip')).toBe(true);
    expect(hasPreview('host.ip')).toBe(true);
  });

  it('should return false if field is not host.name, user.name, or ip type', () => {
    expect(hasPreview('field')).toBe(false); // non-ecs field
    expect(hasPreview('event.category')).toBe(false); // ecs field but not ip type
  });
});
