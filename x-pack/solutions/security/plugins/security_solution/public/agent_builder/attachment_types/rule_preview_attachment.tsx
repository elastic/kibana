/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import { lastValueFrom } from 'rxjs';
import moment from 'moment';
import { useSelector } from 'react-redux';
import {
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_TYPE,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
} from '@kbn/rule-data-utils';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { IKibanaSearchResponse, IEsSearchRequest } from '@kbn/search-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { useDarkMode } from '@kbn/kibana-react-plugin/public';
import type {
  AttachmentRenderProps,
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { DEFAULT_PREVIEW_INDEX, SecurityAgentBuilderAttachments } from '../../../common/constants';
import type { SecurityAppStore, State } from '../../common/store/types';
import type { StartServices } from '../../types';
import { PageScope } from '../../data_view_manager/constants';
import { useInitDataViewManager } from '../../data_view_manager/hooks/use_init_data_view_manager';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useInitSourcerer } from '../../sourcerer/containers/use_init_sourcerer';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { SecuritySolutionFlyout } from '../../flyout';
import { RulePreviewAlertsTable } from '../../detection_engine/rule_creation_ui/components/rule_preview/rule_preview_alerts_table';

const ALERT_ORIGINAL_TIME = 'kibana.alert.original_time' as const;
const ALERTS_TABLE_SIZE = 5;

interface RulePreviewAttachmentData {
  previewId: string;
  attachmentLabel?: string;
}

type RulePreviewAttachment = Attachment<
  SecurityAgentBuilderAttachments.rulePreview,
  RulePreviewAttachmentData
>;

interface PreviewMetadataState {
  total: number;
  ruleType: Type;
  timeframeStart: moment.Moment;
  timeframeEnd: moment.Moment;
  alerts: PreviewAlertRow[];
}

interface RulePreviewAttachmentServices {
  data: DataPublicPluginStart;
  spaces: SpacesPluginStart;
  getServices: () => Promise<StartServices>;
  getStore: () => Promise<SecurityAppStore>;
}

interface RulePreviewMetadataAggregations {
  minTimestamp?: estypes.AggregationsMinAggregate;
  maxTimestamp?: estypes.AggregationsMaxAggregate;
  ruleTypes?: estypes.AggregationsStringTermsAggregate;
}

type RulePreviewMetadataResponse = estypes.SearchResponse<
  RulePreviewAlertSource,
  RulePreviewMetadataAggregations
>;

interface RulePreviewAlertSource {
  [ALERT_ORIGINAL_TIME]?: string;
  [ALERT_SEVERITY]?: string;
  [ALERT_RISK_SCORE]?: number;
  [ALERT_REASON]?: string;
}

interface PreviewAlertRow {
  id: string;
  originalTime: string;
  severity: string;
  riskScore: string;
  reason: string;
}

const RULE_PREVIEW_TYPES: readonly Type[] = [
  'query',
  'saved_query',
  'threshold',
  'threat_match',
  'eql',
  'esql',
  'machine_learning',
  'new_terms',
];

const isRuleType = (value: string): value is Type => {
  return RULE_PREVIEW_TYPES.includes(value as Type);
};

export const getRulePreviewAttachmentDataTableId = (previewId: string): string =>
  `rule-preview-attachment-${previewId}`;

export const buildRulePreviewMetadataSearchRequest = ({
  previewId,
  spaceId,
}: {
  previewId: string;
  spaceId: string;
}): IEsSearchRequest => ({
  params: {
    index: `${DEFAULT_PREVIEW_INDEX}-${spaceId}`,
    size: ALERTS_TABLE_SIZE,
    query: {
      bool: {
        filter: [
          {
            term: {
              [ALERT_RULE_UUID]: previewId,
            },
          },
        ],
      },
    },
    aggs: {
      minTimestamp: {
        min: {
          field: '@timestamp',
        },
      },
      maxTimestamp: {
        max: {
          field: '@timestamp',
        },
      },
      ruleTypes: {
        terms: {
          field: ALERT_RULE_TYPE,
          size: 1,
        },
      },
    },
    sort: [
      {
        [ALERT_ORIGINAL_TIME]: {
          order: 'desc',
          unmapped_type: 'date',
        },
      },
    ],
  },
});

export const getRulePreviewMetadata = (
  response: RulePreviewMetadataResponse
): PreviewMetadataState | undefined => {
  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;
  const minTimestamp = response.aggregations?.minTimestamp?.value;
  const maxTimestamp = response.aggregations?.maxTimestamp?.value;

  if (total === 0 || minTimestamp == null || maxTimestamp == null) {
    return undefined;
  }

  const ruleTypeBuckets = response.aggregations?.ruleTypes?.buckets;
  const ruleTypeKey = Array.isArray(ruleTypeBuckets) ? ruleTypeBuckets[0]?.key : undefined;
  const ruleType =
    typeof ruleTypeKey === 'string' && isRuleType(ruleTypeKey) ? ruleTypeKey : 'query';

  return {
    total,
    ruleType,
    timeframeStart: moment(minTimestamp).subtract(1, 'second'),
    timeframeEnd: moment(maxTimestamp).add(1, 'second'),
    alerts: response.hits.hits.map((hit, index) => {
      const source = hit._source;
      return {
        id: hit._id ?? `${index}`,
        originalTime: source?.[ALERT_ORIGINAL_TIME] ?? '',
        severity: source?.[ALERT_SEVERITY] ?? '',
        riskScore: source?.[ALERT_RISK_SCORE] !== undefined ? String(source[ALERT_RISK_SCORE]) : '',
        reason: source?.[ALERT_REASON] ?? '',
      };
    }),
  };
};

const RulePreviewAttachmentDataViewBootstrap = () => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const initDataViewManager = useInitDataViewManager();
  const sharedStatus = useSelector((state: State) => state.dataViewManager.shared.status);

  useInitSourcerer(PageScope.alerts);

  useEffect(() => {
    if (!newDataViewPickerEnabled) {
      return;
    }

    if (sharedStatus === 'pristine' || sharedStatus === 'error') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, newDataViewPickerEnabled, sharedStatus]);

  return null;
};

const RulePreviewAttachmentThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const darkMode = useDarkMode();

  return <EuiThemeProvider darkMode={darkMode}>{children}</EuiThemeProvider>;
};

const RulePreviewAttachmentSecurityProviders: React.FC<
  React.PropsWithChildren<Pick<RulePreviewAttachmentServices, 'getServices' | 'getStore'>>
> = ({ children, getServices, getStore }) => {
  const [securityContext, setSecurityContext] = useState<{
    services: StartServices;
    store: SecurityAppStore;
  }>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let isMounted = true;

    Promise.all([getServices(), getStore()])
      .then(([services, store]) => {
        if (isMounted) {
          setSecurityContext({ services, store });
        }
      })
      .catch((contextError) => {
        if (isMounted) {
          setError(contextError instanceof Error ? contextError : new Error(String(contextError)));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [getServices, getStore]);

  if (error) {
    return <RulePreviewAttachmentErrorCallout />;
  }

  if (!securityContext) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiLoadingSpinner />
      </EuiPanel>
    );
  }

  return flyoutProviders({
    services: securityContext.services,
    store: securityContext.store,
    children: (
      <RulePreviewAttachmentThemeProvider>
        {children}
        <SecuritySolutionFlyout />
      </RulePreviewAttachmentThemeProvider>
    ),
  });
};

const RulePreviewAttachmentErrorCallout = () => (
  <EuiCallOut
    announceOnMount={false}
    color="danger"
    iconType="warning"
    size="s"
    title={i18n.translate('xpack.securitySolution.agentBuilder.rulePreviewAttachment.errorTitle', {
      defaultMessage: 'Unable to load rule preview',
    })}
  />
);

const RulePreviewInlineContent: React.FC<
  AttachmentRenderProps<RulePreviewAttachment> & RulePreviewAttachmentServices
> = ({ attachment, data, spaces, getServices, getStore }) => {
  const [spaceId, setSpaceId] = useState<string>();
  const [metadata, setMetadata] = useState<PreviewMetadataState>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let isMounted = true;
    spaces
      .getActiveSpace()
      .then((space) => {
        if (isMounted) {
          setSpaceId(space.id);
        }
      })
      .catch((spaceError) => {
        if (isMounted) {
          setError(spaceError instanceof Error ? spaceError : new Error(String(spaceError)));
        }
      });
    return () => {
      isMounted = false;
    };
  }, [spaces]);

  useEffect(() => {
    let isMounted = true;
    if (!spaceId) {
      return;
    }

    const loadMetadata = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await lastValueFrom(
          data.search.search<IEsSearchRequest, IKibanaSearchResponse<RulePreviewMetadataResponse>>(
            buildRulePreviewMetadataSearchRequest({
              previewId: attachment.data.previewId,
              spaceId,
            })
          )
        );

        if (isMounted) {
          setMetadata(getRulePreviewMetadata(response.rawResponse));
        }
      } catch (metadataError) {
        if (isMounted) {
          setError(
            metadataError instanceof Error ? metadataError : new Error(String(metadataError))
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadMetadata();

    return () => {
      isMounted = false;
    };
  }, [attachment.data.previewId, data.search, spaceId]);

  if (error) {
    return <RulePreviewAttachmentErrorCallout />;
  }

  if (isLoading || !spaceId) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiLoadingSpinner />
      </EuiPanel>
    );
  }

  if (!metadata) {
    return (
      <EuiCallOut
        announceOnMount={false}
        color="warning"
        iconType="warning"
        size="s"
        title={i18n.translate(
          'xpack.securitySolution.agentBuilder.rulePreviewAttachment.emptyTitle',
          { defaultMessage: 'No rule preview alerts found' }
        )}
      />
    );
  }

  return (
    <RulePreviewAttachmentSecurityProviders getServices={getServices} getStore={getStore}>
      <RulePreviewAttachmentDataViewBootstrap />
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        <RulePreviewAlertsTable
          previewId={attachment.data.previewId}
          spaceId={spaceId}
          indexPattern={undefined}
          timeframeOptions={{
            timeframeStart: metadata.timeframeStart,
            timeframeEnd: metadata.timeframeEnd,
            interval: '5m',
            lookback: '1m',
          }}
          dataTableId={getRulePreviewAttachmentDataTableId(attachment.data.previewId)}
        />
      </EuiPanel>
    </RulePreviewAttachmentSecurityProviders>
  );
};

export const createRulePreviewAttachmentDefinition = ({
  data,
  spaces,
  getServices,
  getStore,
}: RulePreviewAttachmentServices): AttachmentUIDefinition<RulePreviewAttachment> => ({
  getLabel: (attachment) =>
    attachment.data.attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.rulePreviewAttachment.label', {
      defaultMessage: 'Rule preview',
    }),
  getIcon: () => 'inspect',
  renderInlineContent: (props) => (
    <RulePreviewInlineContent
      {...props}
      data={data}
      spaces={spaces}
      getServices={getServices}
      getStore={getStore}
    />
  ),
});

export const registerRulePreviewAttachment = ({
  attachments,
  data,
  spaces,
  getServices,
  getStore,
}: {
  attachments: AttachmentServiceStartContract;
} & RulePreviewAttachmentServices): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.rulePreview,
    createRulePreviewAttachmentDefinition({ data, spaces, getServices, getStore })
  );
};
