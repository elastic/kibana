/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TableId } from '@kbn/securitysolution-data-table';
import { FLYOUT_PREVIEW_LINK_TEST_ID } from './test_ids';
import { PreviewLink } from './preview_link';
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
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../common/components/user_privileges/user_privileges_context';

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
    useUiSetting: () => false,
  };
});

jest.mock('../../entity_details/shared/hooks/use_entity_from_store', () => ({
  useEntityFromStore: jest.fn().mockReturnValue({
    entity: null,
    entityRecord: null,
    firstSeen: null,
    lastSeen: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

jest.mock('../../../common/components/user_privileges');

const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

const renderPreviewLink = (
  p0: string,
  p1: string,
  p2: string,
  props: {
    field: string;
    value: string;
    entityId?: string;
    dataTestSubj?: string;
    ruleId?: string;
    scopeId?: string;
  }
) =>
  render(
    <TestProviders>
      <PreviewLink
        field={props.field}
        value={props.value}
        entityId={props.entityId}
        data-test-subj={props.dataTestSubj ?? FLYOUT_PREVIEW_LINK_TEST_ID}
        ruleId={props.ruleId}
        scopeId={props.scopeId ?? 'scopeId'}
      />
    </TestProviders>
  );

describe('<PreviewLink />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserPrivileges.mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: true },
      },
    });
  });

  it('should not render a link if field is not previewable', () => {
    const { queryByTestId } = renderPreviewLink('event.category', 'process', 'preview-link', {
      field: 'event.category',
      value: 'process',
      dataTestSubj: 'preview-link',
    });
    expect(queryByTestId(FLYOUT_PREVIEW_LINK_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render value without link if field is not previewable', () => {
    const { queryByTestId, getByText } = render(
      <TestProviders>
        <PreviewLink field="event.category" value="process" scopeId="scopeId">
          <span>{'child'}</span>
        </PreviewLink>
      </TestProviders>
    );

    expect(queryByTestId(FLYOUT_PREVIEW_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(getByText('child')).toBeInTheDocument();
  });

  it('should render a link to open host preview', () => {
    const { getByTestId } = renderPreviewLink('host.name', 'host', 'host-link', {
      field: 'host.name',
      value: 'host',
      dataTestSubj: 'host-link',
    });
    getByTestId('host-link').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: HostPreviewPanelKey,
      params: {
        contextID: 'scopeId',
        hostName: 'host',
        scopeId: 'scopeId',
        banner: HOST_PREVIEW_BANNER,
        entityId: undefined,
      },
    });
  });

  it('should pass entityId to host preview (identity / entity store resolution)', () => {
    const { getByTestId } = renderPreviewLink('host.name', 'my-host', 'host-link-with-entity', {
      field: 'host.name',
      value: 'my-host',
      entityId: 'resolved-host-euid',
      dataTestSubj: 'host-link-with-entity',
    });
    getByTestId('host-link-with-entity').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: HostPreviewPanelKey,
      params: {
        contextID: 'scopeId',
        hostName: 'my-host',
        scopeId: 'scopeId',
        banner: HOST_PREVIEW_BANNER,
        entityId: 'resolved-host-euid',
      },
    });
  });

  it('should render a link to open user preview', () => {
    const { getByTestId } = renderPreviewLink('user.name', 'user', 'user-link', {
      field: 'user.name',
      value: 'user',
      dataTestSubj: 'user-link',
    });
    getByTestId('user-link').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenLastCalledWith({
      id: UserPreviewPanelKey,
      params: {
        contextID: 'scopeId',
        userName: 'user',
        scopeId: 'scopeId',
        banner: USER_PREVIEW_BANNER,
        entityId: undefined,
      },
    });
  });

  it('should render a link to open network preview', () => {
    const { getByTestId } = renderPreviewLink('source.ip', '100:XXX:XXX', 'ip-link', {
      field: 'source.ip',
      value: '100:XXX:XXX',
      dataTestSubj: 'ip-link',
    });
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
    const { getByTestId } = renderPreviewLink('kibana.alert.rule.name', 'ruleId', 'rule-link', {
      field: 'kibana.alert.rule.name',
      value: 'ruleId',
      ruleId: 'ruleId',
      dataTestSubj: 'rule-link',
    });
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

  it('should not render a link when ruleId is not provided for rule name field', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <PreviewLink
          field="kibana.alert.rule.name"
          value="rule"
          data-test-subj="rule-link"
          scopeId="scopeId"
        />
      </TestProviders>
    );
    expect(queryByTestId('rule-link')).not.toBeInTheDocument();
  });

  it('should not render a link when rule name is rendered in rule preview', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <PreviewLink
          field="kibana.alert.rule.name"
          value="rule"
          ruleId="ruleId"
          data-test-subj="rule-link"
          scopeId={TableId.rulePreview}
        />
      </TestProviders>
    );
    expect(queryByTestId('rule-link')).not.toBeInTheDocument();
  });

  it('should not render a rule preview link when user cannot read rules', () => {
    mockUseUserPrivileges.mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: false, edit: false },
      },
    });

    const { queryByTestId, getByText } = render(
      <TestProviders>
        <PreviewLink
          field={'kibana.alert.rule.name'}
          value={'rule-name'}
          data-test-subj={'rule-link'}
          scopeId={'scopeId'}
          ruleId={'ruleId'}
        />
      </TestProviders>
    );

    expect(queryByTestId('rule-link')).not.toBeInTheDocument();
    expect(getByText('rule-name')).toBeInTheDocument();
  });

  it('should still render host preview link when user cannot read rules', () => {
    mockUseUserPrivileges.mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: false, edit: false },
      },
    });

    const { getByTestId } = renderPreviewLink('host.name', 'host', 'host-link', {
      field: 'host.name',
      value: 'host',
      dataTestSubj: 'host-link',
    });

    expect(getByTestId('host-link')).toBeInTheDocument();
  });
});
