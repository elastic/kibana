/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiIcon, EuiLink, EuiMarkdownFormat } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const Unprivileged = ({ hideIlmMessage = false }: { hideIlmMessage?: boolean }) => {
  const {
    services: { docLinks },
  } = useKibana();
  return (
    <EuiEmptyPrompt
      data-test-subj="syntheticsUnprivileged"
      color="plain"
      icon={<EuiIcon type="logoObservability" size="xl" />}
      title={
        <h2>
          <FormattedMessage
            id="xpack.synthetics.dataRetention.unprivileged.unprivilegedTitle"
            defaultMessage="Missing privileges"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.synthetics.params.unprivileged.unprivilegedDescription"
            defaultMessage="You need additional privileges to view Synthetics app data usage and retention settings. {docsLink}"
            values={{
              docsLink: (
                <EuiLink
                  data-test-subj="syntheticsUnprivilegedLearnMoreLink"
                  href={docLinks?.links.synthetics.featureRoles}
                  target="_blank"
                >
                  {i18n.translate('xpack.synthetics.monitorManagement.projectDelete.docsLink', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              ),
            }}
          />
        </p>
      }
      footer={
        <EuiMarkdownFormat
          css={css`
            text-align: initial;
          `}
          children={`\n- ${INDEX_PRIVILEGES} ${hideIlmMessage ? '' : ` \n- ${CLUSTER_PRIVILEGES}`}`}
        />
      }
    />
  );
};

const INDEX_PRIVILEGES = i18n.translate('xpack.synthetics.dataRetention.unprivileged.index', {
  defaultMessage: '`read`, `monitor` on the following Elasticsearch indices: `synthetics-*`',
});

const CLUSTER_PRIVILEGES = i18n.translate('xpack.synthetics.dataRetention.unprivileged.cluster', {
  defaultMessage:
    '`read_ilm`, `monitor` to view and `manage_ilm` to manage ILM policies on the Elasticsearch cluster.',
});
