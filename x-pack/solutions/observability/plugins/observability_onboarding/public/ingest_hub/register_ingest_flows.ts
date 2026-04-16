/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ObservabilityOnboardingPluginStartDeps } from '../plugin';
import { PLUGIN_ID } from '../../common';

export const registerIngestFlows = (plugins: ObservabilityOnboardingPluginStartDeps) => {
  plugins.ingestHub?.registerIngestFlows([
    {
      id: 'kubernetes',
      title: i18n.translate('xpack.observability_onboarding.ingestHub.kubernetes.title', {
        defaultMessage: 'Kubernetes',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.ingestHub.kubernetes.description',
        {
          defaultMessage: 'Monitor your Kubernetes cluster with Elastic Agent',
        }
      ),
      icon: 'logoKubernetes',
      category: i18n.translate('xpack.observability_onboarding.ingestHub.category.containers', {
        defaultMessage: 'Containers',
      }),
      navigateTo: { appId: PLUGIN_ID, path: '/kubernetes/' },
    },
    {
      id: 'docker',
      title: i18n.translate('xpack.observability_onboarding.ingestHub.docker.title', {
        defaultMessage: 'Docker',
      }),
      description: i18n.translate('xpack.observability_onboarding.ingestHub.docker.description', {
        defaultMessage: 'Collect logs and metrics from Docker containers',
      }),
      icon: 'logoDocker',
      category: i18n.translate('xpack.observability_onboarding.ingestHub.category.containers', {
        defaultMessage: 'Containers',
      }),
      navigateTo: {
        appId: 'integrations',
        path: '/detail/docker/overview?returnAppId=ingestHub&returnPath=%2F',
      },
    },
    {
      id: 'amazon_ecs',
      title: i18n.translate('xpack.observability_onboarding.ingestHub.amazonEcs.title', {
        defaultMessage: 'Amazon ECS',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.ingestHub.amazonEcs.description',
        {
          defaultMessage: 'Monitor your Amazon ECS containers and services',
        }
      ),
      icon: 'logoAWS',
      category: i18n.translate('xpack.observability_onboarding.ingestHub.category.containers', {
        defaultMessage: 'Containers',
      }),
      navigateTo: {
        appId: 'integrations',
        path: '/detail/aws/overview?integration=ecs&returnAppId=ingestHub&returnPath=%2F',
      },
    },
    {
      id: 'aws',
      title: i18n.translate('xpack.observability_onboarding.ingestHub.aws.title', {
        defaultMessage: 'Amazon Web Services',
      }),
      description: i18n.translate('xpack.observability_onboarding.ingestHub.aws.description', {
        defaultMessage: 'Monitor your AWS infrastructure in Elastic Observability',
      }),
      icon: 'logoAWS',
      category: i18n.translate('xpack.observability_onboarding.ingestHub.category.cloud', {
        defaultMessage: 'Cloud',
      }),
      navigateTo: {
        appId: 'integrations',
        path: '/detail/aws/overview?returnAppId=ingestHub&returnPath=%2F',
      },
    },
    {
      id: 'gcp',
      title: i18n.translate('xpack.observability_onboarding.ingestHub.gcp.title', {
        defaultMessage: 'Google Cloud Platform',
      }),
      description: i18n.translate('xpack.observability_onboarding.ingestHub.gcp.description', {
        defaultMessage: 'Monitor your GCP infrastructure in Elastic Observability',
      }),
      icon: 'logoGCP',
      category: i18n.translate('xpack.observability_onboarding.ingestHub.category.cloud', {
        defaultMessage: 'Cloud',
      }),
      navigateTo: {
        appId: 'integrations',
        path: '/detail/gcp/overview?returnAppId=ingestHub&returnPath=%2F',
      },
    },
    {
      id: 'azure',
      title: i18n.translate('xpack.observability_onboarding.ingestHub.azure.title', {
        defaultMessage: 'Azure',
      }),
      description: i18n.translate('xpack.observability_onboarding.ingestHub.azure.description', {
        defaultMessage: 'Monitor your Azure infrastructure in Elastic Observability',
      }),
      icon: 'logoAzure',
      category: i18n.translate('xpack.observability_onboarding.ingestHub.category.cloud', {
        defaultMessage: 'Cloud',
      }),
      navigateTo: {
        appId: 'integrations',
        path: '/detail/azure/overview?returnAppId=ingestHub&returnPath=%2F',
      },
    },
  ]);
};
