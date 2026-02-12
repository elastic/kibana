/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { BoolQuery } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { PageScope } from '../../../data_view_manager/constants';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import { RISK_SCORE_INDEX_PATTERN } from '../../../../common/entity_analytics/risk_engine';
import { RiskScorePreviewTable } from './risk_score_preview_table';
import * as i18n from '../../translations';
import { useRiskScorePreview } from '../../api/hooks/use_preview_risk_scores';
import type { RiskEngineMissingPrivilegesResponse } from '../../hooks/use_missing_risk_engine_privileges';
import { userHasRiskEngineReadPermissions } from '../../common';
import { EntityIconByType } from '../entity_store/helpers';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useEntityAnalyticsTypes } from '../../hooks/use_enabled_entity_types';
import type { AlertFilter } from './common';

interface IRiskScorePreviewPanel {
  showMessage: React.ReactNode;
  hideMessage: React.ReactNode;
  isLoading: boolean;
  items: EntityRiskScoreRecord[];
  type: EntityType;
}

const getRiskiestScores = (scores: EntityRiskScoreRecord[] = [], field: string) =>
  scores
    ?.filter((item) => item?.id_field === field)
    ?.sort((a, b) => b?.calculated_score_norm - a?.calculated_score_norm)
    ?.slice(0, 5) || [];

export const RiskScorePreviewSection: React.FC<{
  privileges: RiskEngineMissingPrivilegesResponse;
  includeClosedAlerts: boolean;
  from: string;
  to: string;
  alertFilters?: Array<AlertFilter>;
}> = ({ privileges, includeClosedAlerts, from, to, alertFilters }) => {
  const sectionBody = useMemo(() => {
    if (privileges.isLoading) {
      return (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (userHasRiskEngineReadPermissions(privileges)) {
      return (
        <RiskEnginePreview
          includeClosedAlerts={includeClosedAlerts}
          from={from}
          to={to}
          alertFilters={alertFilters}
        />
      );
    }

    return <MissingPermissionsCallout />;
  }, [privileges, includeClosedAlerts, from, to, alertFilters]);

  return (
    <>
      <EuiTitle>
        <h2>{i18n.PREVIEW}</h2>
      </EuiTitle>
      <EuiSpacer size={'s'} />
      {sectionBody}
    </>
  );
};

const MissingPermissionsCallout = () => {
  return (
    <EuiCallOut
      title={i18n.PREVIEW_MISSING_PERMISSIONS_TITLE}
      color="primary"
      iconType="info"
      data-test-subj="missing-risk-engine-preview-permissions"
    >
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.riskScore.riskScorePreview.missingPermissionsCallout.description"
          defaultMessage="Read permission is required for the {index} index pattern in order to preview data. Contact your administrator for further assistance."
          values={{
            index: <EuiCode>{RISK_SCORE_INDEX_PATTERN}</EuiCode>,
          }}
        />
      </EuiText>
    </EuiCallOut>
  );
};

const RiskScorePreviewPanel = ({
  items,
  showMessage,
  hideMessage,
  isLoading,
  type,
}: IRiskScorePreviewPanel) => {
  const [trigger, setTrigger] = useState<'closed' | 'open'>('open');
  const onToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    setTrigger(newState);
  };

  return (
    <EuiPanel hasBorder={true}>
      <EuiAccordion
        initialIsOpen={true}
        isLoading={isLoading}
        id={'host-table'}
        buttonContent={trigger === 'closed' ? showMessage : hideMessage}
        forceState={trigger}
        onToggle={onToggle}
        extraAction={<EuiIcon type={EntityIconByType[type]} />}
      >
        <>
          <EuiSpacer size={'m'} />
          <RiskScorePreviewTable items={items} type={type} />
        </>
      </EuiAccordion>
    </EuiPanel>
  );
};

const RiskEnginePreview: React.FC<{
  includeClosedAlerts: boolean;
  from: string;
  to: string;
  alertFilters?: Array<AlertFilter>;
}> = ({ includeClosedAlerts, from, to, alertFilters }) => {
  const entityTypes = useEntityAnalyticsTypes();

  const [filters] = useState<{ bool: BoolQuery }>({
    bool: { must: [], filter: [], should: [], must_not: [] },
  });

  const { dataView } = useDataView(PageScope.alerts);

  const { data, isLoading, refetch, isError } = useRiskScorePreview({
    data_view_id: dataView?.title,
    filter: filters,
    range: {
      start: from,
      end: to,
    },
    exclude_alert_statuses: includeClosedAlerts ? [] : ['closed'],
    // Pass filters to API (will only work once backend PR merges)
    filters: alertFilters && alertFilters.length > 0 ? alertFilters : undefined,
  });

  if (isError) {
    return (
      <EuiCallOut
        announceOnMount
        data-test-subj="risk-preview-error"
        title={i18n.PREVIEW_ERROR_TITLE}
        color="danger"
        iconType="error"
      >
        <p>{i18n.PREVIEW_ERROR_MESSAGE}</p>
        <EuiButton
          data-test-subj="risk-preview-error-button"
          color="danger"
          onClick={() => refetch()}
        >
          {i18n.PREVIEW_ERROR_TRY_AGAIN}
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiText>{i18n.PREVIEW_DESCRIPTION}</EuiText>

      <EuiSpacer />
      <EuiSpacer />

      {entityTypes.map((entityType) => (
        <Fragment key={entityType}>
          <RiskScorePreviewPanel
            items={getRiskiestScores(
              data?.scores[entityType],
              EntityTypeToIdentifierField[entityType]
            )}
            showMessage={
              <FormattedMessage
                id="xpack.securitySolution.riskScore.riskScorePreview.show"
                defaultMessage="Show {entityType}s"
                values={{
                  entityType,
                }}
              />
            }
            hideMessage={
              <FormattedMessage
                id="xpack.securitySolution.riskScore.riskScorePreview.hide"
                defaultMessage="Hide {entityType}s"
                values={{
                  entityType,
                }}
              />
            }
            isLoading={isLoading}
            type={entityType}
          />
          <EuiSpacer />
        </Fragment>
      ))}
    </>
  );
};
