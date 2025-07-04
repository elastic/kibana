/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiContextMenuItem, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { APPLICATIONS_PLUGIN } from '../../../../../../../common/constants';
import { SEARCH_APPLICATION_CREATION_PATH } from '../../../../../applications/routes';
import { ESINDEX_QUERY_PARAMETER } from '../../../../../shared/constants';
import { generateEncodedPath } from '../../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../../shared/kibana';

export interface CreateEngineMenuItemProps {
  indexName?: string;
  ingestionMethod: string;
  isHiddenIndex?: boolean;
}

export const CreateEngineMenuItem: React.FC<CreateEngineMenuItemProps> = ({
  indexName,
  ingestionMethod,
  isHiddenIndex,
}) => {
  const searchApplicationCreationPath = !indexName
    ? `${APPLICATIONS_PLUGIN.URL}${SEARCH_APPLICATION_CREATION_PATH}`
    : generateEncodedPath(
        `${APPLICATIONS_PLUGIN.URL}${SEARCH_APPLICATION_CREATION_PATH}?:indexKey=:indexName`,
        {
          indexKey: ESINDEX_QUERY_PARAMETER,
          indexName,
        }
      );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem>
        <EuiContextMenuItem
          data-telemetry-id={`entSearchContent-${ingestionMethod}-header-createEngine-createEngine`}
          size="s"
          icon="plusInCircle"
          onClick={() => {
            KibanaLogic.values.navigateToUrl(searchApplicationCreationPath, {
              shouldNotCreateHref: true,
            });
          }}
          disabled={isHiddenIndex}
        >
          <EuiText>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.index.searchApplication.createSearchApplication',
                {
                  defaultMessage: 'Create a Search Application',
                }
              )}
            </p>
          </EuiText>
        </EuiContextMenuItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
