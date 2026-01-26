/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Entity definition based on OpenTelemetry semantic conventions and New Relic entity types
 * @see https://opentelemetry.io/docs/specs/semconv/resource/
 * @see https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
 * @see https://opentelemetry.io/docs/specs/semconv/system/container-metrics/
 * @see https://opentelemetry.io/docs/specs/semconv/system/k8s-metrics/
 * @see https://opentelemetry.io/docs/specs/semconv/system/process-metrics/
 * @see https://github.com/open-telemetry/semantic-conventions/tree/main/model
 * @see https://github.com/newrelic/entity-definitions/tree/main/entity-types
 */
export interface EntityDefinition {
  /** Unique entity type identifier */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** The primary identifying attribute for this entity */
  identifyingAttribute: string;
  /** Alternative identifying attributes (fallbacks) */
  alternativeAttributes?: string[];
  /** Icon type for UI display */
  iconType: string;
  /** Category for grouping in UI */
  category:
    | 'infrastructure'
    | 'kubernetes'
    | 'application'
    | 'cloud'
    | 'aws'
    | 'serverless'
    | 'database'
    | 'messaging';
  /** Description of the entity type */
  description: string;
  /**
   * Metric prefixes for semantic metric matching based on OTel conventions
   * @see https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
   */
  metricPrefixes?: string[];
}

/**
 * Entity definitions based on OpenTelemetry semantic conventions
 * Each entity has a primary identifying attribute that uniquely identifies instances
 */
export const ENTITY_DEFINITIONS: EntityDefinition[] = [
  // Infrastructure entities
  // OTel system metrics: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
  {
    id: 'host',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.host', {
      defaultMessage: 'Hosts',
    }),
    identifyingAttribute: 'host.name',
    alternativeAttributes: ['host.id', 'host.hostname'],
    iconType: 'compute',
    category: 'infrastructure',
    description: i18n.translate('xpack.infra.esqlInventory.entity.host.description', {
      defaultMessage: 'Physical or virtual machines',
    }),
    // OTel: system.cpu.*, system.memory.*, system.disk.*, system.network.*, system.filesystem.*
    metricPrefixes: ['system.'],
  },
  // OTel container metrics: https://opentelemetry.io/docs/specs/semconv/system/container-metrics/
  {
    id: 'container',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.container', {
      defaultMessage: 'Containers',
    }),
    identifyingAttribute: 'container.id',
    alternativeAttributes: ['container.name'],
    iconType: 'container',
    category: 'infrastructure',
    description: i18n.translate('xpack.infra.esqlInventory.entity.container.description', {
      defaultMessage: 'Docker or OCI containers',
    }),
    // OTel: container.cpu.time, container.cpu.usage, container.uptime
    metricPrefixes: ['container.'],
  },
  {
    id: 'service',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.service', {
      defaultMessage: 'Services',
    }),
    identifyingAttribute: 'service.name',
    alternativeAttributes: ['service.instance.id'],
    iconType: 'apmApp',
    category: 'application',
    description: i18n.translate('xpack.infra.esqlInventory.entity.service.description', {
      defaultMessage: 'Application services',
    }),
    // Services typically use spans/traces, not specific metric prefixes
    metricPrefixes: [],
  },

  // Kubernetes entities
  // OTel K8s metrics: https://opentelemetry.io/docs/specs/semconv/system/k8s-metrics/
  {
    id: 'k8s.pod',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sPod', {
      defaultMessage: 'K8s Pods',
    }),
    identifyingAttribute: 'k8s.pod.name',
    alternativeAttributes: ['k8s.pod.uid', 'kubernetes.pod.name', 'kubernetes.pod.uid'],
    iconType: 'kubernetesNode',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sPod.description', {
      defaultMessage: 'Kubernetes Pods',
    }),
    // OTel: k8s.pod.uptime, k8s.pod.cpu.usage (was k8s.pod.cpu.utilization)
    metricPrefixes: ['k8s.pod.', 'kubernetes.pod.'],
  },
  {
    id: 'k8s.node',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sNode', {
      defaultMessage: 'K8s Nodes',
    }),
    identifyingAttribute: 'k8s.node.name',
    alternativeAttributes: ['k8s.node.uid', 'kubernetes.node.name'],
    iconType: 'node',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sNode.description', {
      defaultMessage: 'Kubernetes Nodes',
    }),
    // OTel: k8s.node.cpu.usage (was k8s.node.cpu.utilization)
    metricPrefixes: ['k8s.node.', 'kubernetes.node.'],
  },
  {
    id: 'k8s.container',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sContainer', {
      defaultMessage: 'K8s Containers',
    }),
    identifyingAttribute: 'k8s.container.name',
    alternativeAttributes: ['kubernetes.container.name'],
    iconType: 'container',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sContainer.description', {
      defaultMessage: 'Containers running in Kubernetes',
    }),
    // Kubernetes containers also use container.* metrics
    metricPrefixes: ['k8s.container.', 'kubernetes.container.', 'container.'],
  },
  {
    id: 'k8s.deployment',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sDeployment', {
      defaultMessage: 'K8s Deployments',
    }),
    identifyingAttribute: 'k8s.deployment.name',
    alternativeAttributes: ['k8s.deployment.uid', 'kubernetes.deployment.name'],
    iconType: 'package',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sDeployment.description', {
      defaultMessage: 'Kubernetes Deployments',
    }),
    metricPrefixes: ['k8s.deployment.', 'kubernetes.deployment.'],
  },
  {
    id: 'k8s.namespace',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sNamespace', {
      defaultMessage: 'K8s Namespaces',
    }),
    identifyingAttribute: 'k8s.namespace.name',
    alternativeAttributes: ['kubernetes.namespace'],
    iconType: 'namespace',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sNamespace.description', {
      defaultMessage: 'Kubernetes Namespaces',
    }),
    metricPrefixes: ['k8s.namespace.', 'kubernetes.namespace.'],
  },
  {
    id: 'k8s.replicaset',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sReplicaSet', {
      defaultMessage: 'K8s ReplicaSets',
    }),
    identifyingAttribute: 'k8s.replicaset.name',
    alternativeAttributes: ['k8s.replicaset.uid', 'kubernetes.replicaset.name'],
    iconType: 'copy',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sReplicaSet.description', {
      defaultMessage: 'Kubernetes ReplicaSets',
    }),
    metricPrefixes: ['k8s.replicaset.', 'kubernetes.replicaset.'],
  },
  {
    id: 'k8s.daemonset',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sDaemonSet', {
      defaultMessage: 'K8s DaemonSets',
    }),
    identifyingAttribute: 'k8s.daemonset.name',
    alternativeAttributes: ['k8s.daemonset.uid', 'kubernetes.daemonset.name'],
    iconType: 'layers',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sDaemonSet.description', {
      defaultMessage: 'Kubernetes DaemonSets',
    }),
    metricPrefixes: ['k8s.daemonset.', 'kubernetes.daemonset.'],
  },
  {
    id: 'k8s.statefulset',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sStatefulSet', {
      defaultMessage: 'K8s StatefulSets',
    }),
    identifyingAttribute: 'k8s.statefulset.name',
    alternativeAttributes: ['k8s.statefulset.uid', 'kubernetes.statefulset.name'],
    iconType: 'database',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sStatefulSet.description', {
      defaultMessage: 'Kubernetes StatefulSets',
    }),
    metricPrefixes: ['k8s.statefulset.', 'kubernetes.statefulset.'],
  },
  {
    id: 'k8s.job',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sJob', {
      defaultMessage: 'K8s Jobs',
    }),
    identifyingAttribute: 'k8s.job.name',
    alternativeAttributes: ['k8s.job.uid', 'kubernetes.job.name'],
    iconType: 'play',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sJob.description', {
      defaultMessage: 'Kubernetes Jobs',
    }),
    metricPrefixes: ['k8s.job.', 'kubernetes.job.'],
  },
  {
    id: 'k8s.cronjob',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sCronJob', {
      defaultMessage: 'K8s CronJobs',
    }),
    identifyingAttribute: 'k8s.cronjob.name',
    alternativeAttributes: ['k8s.cronjob.uid', 'kubernetes.cronjob.name'],
    iconType: 'clock',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sCronJob.description', {
      defaultMessage: 'Kubernetes CronJobs',
    }),
    metricPrefixes: ['k8s.cronjob.', 'kubernetes.cronjob.'],
  },
  {
    id: 'k8s.cluster',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.k8sCluster', {
      defaultMessage: 'K8s Clusters',
    }),
    identifyingAttribute: 'k8s.cluster.name',
    alternativeAttributes: ['k8s.cluster.uid', 'kubernetes.cluster.name'],
    iconType: 'cluster',
    category: 'kubernetes',
    description: i18n.translate('xpack.infra.esqlInventory.entity.k8sCluster.description', {
      defaultMessage: 'Kubernetes Clusters',
    }),
    metricPrefixes: ['k8s.cluster.', 'kubernetes.cluster.'],
  },

  // Cloud entities
  // OTel cloud resource: https://opentelemetry.io/docs/specs/semconv/resource/cloud/
  {
    id: 'cloud.instance',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.cloudInstance', {
      defaultMessage: 'Cloud Instances',
    }),
    identifyingAttribute: 'cloud.instance.id',
    alternativeAttributes: ['cloud.instance.name'],
    iconType: 'cloudSunny',
    category: 'cloud',
    description: i18n.translate('xpack.infra.esqlInventory.entity.cloudInstance.description', {
      defaultMessage: 'Cloud provider instances (EC2, GCE, Azure VM)',
    }),
    // Generic cloud instances - no specific OTel metric prefix
    metricPrefixes: [],
  },
  {
    id: 'cloud.region',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.cloudRegion', {
      defaultMessage: 'Cloud Regions',
    }),
    identifyingAttribute: 'cloud.region',
    iconType: 'globe',
    category: 'cloud',
    description: i18n.translate('xpack.infra.esqlInventory.entity.cloudRegion.description', {
      defaultMessage: 'Cloud provider regions',
    }),
    metricPrefixes: [],
  },
  {
    id: 'cloud.availability_zone',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.cloudAZ', {
      defaultMessage: 'Availability Zones',
    }),
    identifyingAttribute: 'cloud.availability_zone',
    iconType: 'visMapRegion',
    category: 'cloud',
    description: i18n.translate('xpack.infra.esqlInventory.entity.cloudAZ.description', {
      defaultMessage: 'Cloud availability zones',
    }),
    metricPrefixes: [],
  },
  {
    id: 'cloud.provider',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.cloudProvider', {
      defaultMessage: 'Cloud Providers',
    }),
    identifyingAttribute: 'cloud.provider',
    iconType: 'cloudSunny',
    category: 'cloud',
    description: i18n.translate('xpack.infra.esqlInventory.entity.cloudProvider.description', {
      defaultMessage: 'Cloud providers (AWS, GCP, Azure)',
    }),
    metricPrefixes: [],
  },

  // AWS entities
  // Based on Kibana inventory models and OTel AWS semantic conventions
  // @see https://opentelemetry.io/docs/specs/semconv/resource/cloud-provider/aws/
  // @see x-pack/solutions/observability/plugins/metrics_data_access/common/inventory_models/
  {
    id: 'aws.ec2',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.awsEc2', {
      defaultMessage: 'EC2 Instances',
    }),
    // Primary: cloud.instance.id (from Kibana inventory model)
    // OTel uses cloud.resource_id for AWS ARN
    identifyingAttribute: 'cloud.instance.id',
    alternativeAttributes: ['cloud.instance.name', 'aws.ec2.instance.public.ip'],
    iconType: 'compute',
    category: 'aws',
    description: i18n.translate('xpack.infra.esqlInventory.entity.awsEc2.description', {
      defaultMessage: 'Amazon EC2 instances',
    }),
    // Elastic aws.ec2.* metrics
    metricPrefixes: ['aws.ec2.'],
  },
  {
    id: 'aws.rds',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.awsRds', {
      defaultMessage: 'RDS Databases',
    }),
    // Primary: aws.rds.db_instance.identifier (from Kibana inventory model)
    identifyingAttribute: 'aws.rds.db_instance.identifier',
    alternativeAttributes: ['aws.rds.db_instance.arn'],
    iconType: 'database',
    category: 'aws',
    description: i18n.translate('xpack.infra.esqlInventory.entity.awsRds.description', {
      defaultMessage: 'Amazon RDS database instances',
    }),
    // Elastic aws.rds.* metrics
    metricPrefixes: ['aws.rds.'],
  },
  {
    id: 'aws.s3',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.awsS3', {
      defaultMessage: 'S3 Buckets',
    }),
    // Primary: aws.s3.bucket.name (from Kibana inventory model)
    identifyingAttribute: 'aws.s3.bucket.name',
    iconType: 'storage',
    category: 'aws',
    description: i18n.translate('xpack.infra.esqlInventory.entity.awsS3.description', {
      defaultMessage: 'Amazon S3 buckets',
    }),
    // Elastic aws.s3.* metrics
    metricPrefixes: ['aws.s3.'],
  },
  {
    id: 'aws.sqs',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.awsSqs', {
      defaultMessage: 'SQS Queues',
    }),
    // Primary: aws.sqs.queue.name (from Kibana inventory model)
    identifyingAttribute: 'aws.sqs.queue.name',
    alternativeAttributes: ['messaging.destination.name'],
    iconType: 'listAdd',
    category: 'aws',
    description: i18n.translate('xpack.infra.esqlInventory.entity.awsSqs.description', {
      defaultMessage: 'Amazon SQS queues',
    }),
    // Elastic aws.sqs.* metrics, OTel messaging.*
    metricPrefixes: ['aws.sqs.', 'messaging.'],
  },
  {
    id: 'aws.lambda',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.awsLambda', {
      defaultMessage: 'Lambda Functions',
    }),
    // OTel: faas.name is the primary identifier for serverless functions
    // @see https://opentelemetry.io/docs/specs/semconv/resource/faas/
    identifyingAttribute: 'faas.name',
    alternativeAttributes: ['cloud.resource_id', 'aws.lambda.invoked_arn'],
    iconType: 'function',
    category: 'aws',
    description: i18n.translate('xpack.infra.esqlInventory.entity.awsLambda.description', {
      defaultMessage: 'AWS Lambda serverless functions',
    }),
    // OTel: faas.* metrics, Elastic: aws.lambda.*
    metricPrefixes: ['faas.', 'aws.lambda.'],
  },
  {
    id: 'aws.ecs.cluster',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.awsEcsCluster', {
      defaultMessage: 'ECS Clusters',
    }),
    // OTel: aws.ecs.cluster.arn
    // @see https://opentelemetry.io/docs/specs/semconv/resource/cloud-provider/aws/ecs/
    identifyingAttribute: 'aws.ecs.cluster.arn',
    iconType: 'cluster',
    category: 'aws',
    description: i18n.translate('xpack.infra.esqlInventory.entity.awsEcsCluster.description', {
      defaultMessage: 'Amazon ECS clusters',
    }),
    metricPrefixes: ['aws.ecs.'],
  },
  {
    id: 'aws.ecs.task',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.awsEcsTask', {
      defaultMessage: 'ECS Tasks',
    }),
    // OTel: aws.ecs.task.arn
    identifyingAttribute: 'aws.ecs.task.arn',
    alternativeAttributes: ['aws.ecs.task.family', 'aws.ecs.task.revision'],
    iconType: 'document',
    category: 'aws',
    description: i18n.translate('xpack.infra.esqlInventory.entity.awsEcsTask.description', {
      defaultMessage: 'Amazon ECS tasks',
    }),
    metricPrefixes: ['aws.ecs.'],
  },
  {
    id: 'aws.dynamodb',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.awsDynamodb', {
      defaultMessage: 'DynamoDB Tables',
    }),
    // OTel uses db.namespace (replaces deprecated db.name)
    // AWS-specific: aws.dynamodb.table_names
    identifyingAttribute: 'db.namespace',
    alternativeAttributes: ['aws.dynamodb.table_names'],
    iconType: 'tableDensityNormal',
    category: 'aws',
    description: i18n.translate('xpack.infra.esqlInventory.entity.awsDynamodb.description', {
      defaultMessage: 'Amazon DynamoDB tables',
    }),
    // OTel db.* metrics, Elastic aws.dynamodb.*
    metricPrefixes: ['db.', 'aws.dynamodb.'],
  },

  // Serverless / FaaS entities
  // OTel FaaS: https://opentelemetry.io/docs/specs/semconv/resource/faas/
  {
    id: 'faas',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.faas', {
      defaultMessage: 'Serverless Functions',
    }),
    identifyingAttribute: 'faas.name',
    alternativeAttributes: ['faas.id', 'cloud.resource_id'],
    iconType: 'function',
    category: 'serverless',
    description: i18n.translate('xpack.infra.esqlInventory.entity.faas.description', {
      defaultMessage: 'Serverless functions (Lambda, Cloud Functions, Azure Functions)',
    }),
    // OTel: faas.* metrics
    metricPrefixes: ['faas.'],
  },

  // Process entities
  // OTel process metrics: https://opentelemetry.io/docs/specs/semconv/system/process-metrics/
  {
    id: 'process',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.process', {
      defaultMessage: 'Processes',
    }),
    identifyingAttribute: 'process.pid',
    alternativeAttributes: ['process.executable.name', 'process.command', 'process.name'],
    iconType: 'console',
    category: 'infrastructure',
    description: i18n.translate('xpack.infra.esqlInventory.entity.process.description', {
      defaultMessage: 'Operating system processes',
    }),
    // OTel: process.cpu.time
    metricPrefixes: ['process.'],
  },

  // Database entities
  // OTel database: https://opentelemetry.io/docs/specs/semconv/database/
  // Note: db.name is deprecated, use db.namespace
  {
    id: 'database',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.database', {
      defaultMessage: 'Databases',
    }),
    // OTel: db.namespace (stable, replaces deprecated db.name)
    identifyingAttribute: 'db.namespace',
    alternativeAttributes: ['db.name', 'db.system'],
    iconType: 'database',
    category: 'database',
    description: i18n.translate('xpack.infra.esqlInventory.entity.database.description', {
      defaultMessage: 'Database instances',
    }),
    // OTel: db.* metrics
    metricPrefixes: ['db.'],
  },
  {
    id: 'redis',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.redis', {
      defaultMessage: 'Redis Instances',
    }),
    identifyingAttribute: 'db.redis.database_index',
    alternativeAttributes: ['server.address', 'net.peer.name'],
    iconType: 'database',
    category: 'database',
    description: i18n.translate('xpack.infra.esqlInventory.entity.redis.description', {
      defaultMessage: 'Redis cache instances',
    }),
    metricPrefixes: ['db.', 'redis.'],
  },
  {
    id: 'elasticsearch',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.elasticsearch', {
      defaultMessage: 'Elasticsearch Clusters',
    }),
    identifyingAttribute: 'db.elasticsearch.cluster.name',
    alternativeAttributes: ['elasticsearch.cluster.name', 'elasticsearch.cluster.uuid'],
    iconType: 'logoElasticsearch',
    category: 'database',
    description: i18n.translate('xpack.infra.esqlInventory.entity.elasticsearch.description', {
      defaultMessage: 'Elasticsearch clusters',
    }),
    metricPrefixes: ['elasticsearch.', 'db.'],
  },
  {
    id: 'mongodb',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.mongodb', {
      defaultMessage: 'MongoDB Databases',
    }),
    identifyingAttribute: 'db.mongodb.collection',
    alternativeAttributes: ['db.namespace', 'db.name'],
    iconType: 'database',
    category: 'database',
    description: i18n.translate('xpack.infra.esqlInventory.entity.mongodb.description', {
      defaultMessage: 'MongoDB databases',
    }),
    metricPrefixes: ['db.', 'mongodb.'],
  },
  {
    id: 'postgresql',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.postgresql', {
      defaultMessage: 'PostgreSQL Databases',
    }),
    identifyingAttribute: 'db.postgresql.schema',
    alternativeAttributes: ['db.namespace', 'db.name'],
    iconType: 'database',
    category: 'database',
    description: i18n.translate('xpack.infra.esqlInventory.entity.postgresql.description', {
      defaultMessage: 'PostgreSQL databases',
    }),
    metricPrefixes: ['db.', 'postgresql.'],
  },
  {
    id: 'mysql',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.mysql', {
      defaultMessage: 'MySQL Databases',
    }),
    identifyingAttribute: 'db.mysql.schema',
    alternativeAttributes: ['db.namespace', 'db.name'],
    iconType: 'database',
    category: 'database',
    description: i18n.translate('xpack.infra.esqlInventory.entity.mysql.description', {
      defaultMessage: 'MySQL databases',
    }),
    metricPrefixes: ['db.', 'mysql.'],
  },

  // Messaging entities
  // OTel messaging: https://opentelemetry.io/docs/specs/semconv/messaging/
  {
    id: 'kafka',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.kafka', {
      defaultMessage: 'Kafka Topics',
    }),
    // OTel uses messaging.destination.name for topic name
    // @see https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
    identifyingAttribute: 'messaging.destination.name',
    alternativeAttributes: ['kafka.topic', 'messaging.kafka.consumer.group'],
    iconType: 'logstashQueue',
    category: 'messaging',
    description: i18n.translate('xpack.infra.esqlInventory.entity.kafka.description', {
      defaultMessage: 'Apache Kafka topics',
    }),
    metricPrefixes: ['messaging.', 'kafka.'],
  },
  {
    id: 'rabbitmq',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.rabbitmq', {
      defaultMessage: 'RabbitMQ Queues',
    }),
    identifyingAttribute: 'messaging.destination.name',
    alternativeAttributes: ['messaging.rabbitmq.routing_key'],
    iconType: 'logstashQueue',
    category: 'messaging',
    description: i18n.translate('xpack.infra.esqlInventory.entity.rabbitmq.description', {
      defaultMessage: 'RabbitMQ queues',
    }),
    metricPrefixes: ['messaging.', 'rabbitmq.'],
  },
  {
    id: 'messaging.destination',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.messagingDestination', {
      defaultMessage: 'Message Queues',
    }),
    identifyingAttribute: 'messaging.destination.name',
    alternativeAttributes: ['messaging.system'],
    iconType: 'logstashQueue',
    category: 'messaging',
    description: i18n.translate(
      'xpack.infra.esqlInventory.entity.messagingDestination.description',
      { defaultMessage: 'Message queue destinations' }
    ),
    metricPrefixes: ['messaging.'],
  },

  // Application entities
  {
    id: 'browser',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.browser', {
      defaultMessage: 'Browser Apps',
    }),
    identifyingAttribute: 'browser.name',
    alternativeAttributes: ['user_agent.name', 'browser.platform'],
    iconType: 'desktop',
    category: 'application',
    description: i18n.translate('xpack.infra.esqlInventory.entity.browser.description', {
      defaultMessage: 'Browser applications',
    }),
    metricPrefixes: ['browser.'],
  },
  {
    id: 'mobile',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.mobile', {
      defaultMessage: 'Mobile Apps',
    }),
    identifyingAttribute: 'mobile.app.name',
    alternativeAttributes: ['device.model.name', 'os.name'],
    iconType: 'mobile',
    category: 'application',
    description: i18n.translate('xpack.infra.esqlInventory.entity.mobile.description', {
      defaultMessage: 'Mobile applications',
    }),
    metricPrefixes: ['mobile.'],
  },
  {
    id: 'url',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.url', {
      defaultMessage: 'URLs',
    }),
    identifyingAttribute: 'url.full',
    alternativeAttributes: ['url.path', 'url.domain', 'http.url'],
    iconType: 'link',
    category: 'application',
    description: i18n.translate('xpack.infra.esqlInventory.entity.url.description', {
      defaultMessage: 'URL endpoints',
    }),
    // HTTP metrics from OTel
    metricPrefixes: ['http.'],
  },
  {
    id: 'http.route',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.httpRoute', {
      defaultMessage: 'HTTP Routes',
    }),
    identifyingAttribute: 'http.route',
    alternativeAttributes: ['url.path'],
    iconType: 'link',
    category: 'application',
    description: i18n.translate('xpack.infra.esqlInventory.entity.httpRoute.description', {
      defaultMessage: 'HTTP API routes',
    }),
    metricPrefixes: ['http.'],
  },
  {
    id: 'user',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.user', {
      defaultMessage: 'Users',
    }),
    identifyingAttribute: 'user.id',
    alternativeAttributes: ['user.name', 'user.email', 'enduser.id'],
    iconType: 'user',
    category: 'application',
    description: i18n.translate('xpack.infra.esqlInventory.entity.user.description', {
      defaultMessage: 'Application users',
    }),
    metricPrefixes: [],
  },

  // Network entities
  {
    id: 'network.peer',
    displayName: i18n.translate('xpack.infra.esqlInventory.entity.networkPeer', {
      defaultMessage: 'Network Peers',
    }),
    identifyingAttribute: 'network.peer.address',
    alternativeAttributes: ['net.peer.name', 'server.address', 'client.address'],
    iconType: 'globe',
    category: 'infrastructure',
    description: i18n.translate('xpack.infra.esqlInventory.entity.networkPeer.description', {
      defaultMessage: 'Network endpoints and peers',
    }),
    // Network metrics are part of system.network.* in OTel
    metricPrefixes: ['network.'],
  },
];

/**
 * Get all identifying attributes from entity definitions
 * Used to detect which entities are available in the data
 */
export const getAllEntityAttributes = (): string[] => {
  const attributes = new Set<string>();
  for (const entity of ENTITY_DEFINITIONS) {
    attributes.add(entity.identifyingAttribute);
    if (entity.alternativeAttributes) {
      for (const alt of entity.alternativeAttributes) {
        attributes.add(alt);
      }
    }
  }
  return Array.from(attributes);
};

/**
 * Find matching entity definitions based on available field names
 * Returns entities whose identifying attribute exists in the available fields
 */
export const findAvailableEntities = (availableFields: string[]): EntityDefinition[] => {
  const fieldSet = new Set(availableFields);
  const matchedEntities: EntityDefinition[] = [];

  for (const entity of ENTITY_DEFINITIONS) {
    // Check primary attribute
    if (fieldSet.has(entity.identifyingAttribute)) {
      matchedEntities.push(entity);
      continue;
    }
    // Check alternative attributes
    if (entity.alternativeAttributes) {
      for (const alt of entity.alternativeAttributes) {
        if (fieldSet.has(alt)) {
          // Return entity with the matched alternative as primary
          matchedEntities.push({
            ...entity,
            identifyingAttribute: alt,
          });
          break;
        }
      }
    }
  }

  return matchedEntities;
};

/**
 * Find entity definition by its identifying attribute
 */
export const findEntityByAttribute = (attribute: string): EntityDefinition | undefined => {
  for (const entity of ENTITY_DEFINITIONS) {
    if (entity.identifyingAttribute === attribute) {
      return entity;
    }
    if (entity.alternativeAttributes?.includes(attribute)) {
      return { ...entity, identifyingAttribute: attribute };
    }
  }
  return undefined;
};

/**
 * Find metrics that semantically match an entity based on OTel naming conventions
 * Uses the entity's metricPrefixes to filter available metric fields
 * @param entity The entity definition to match metrics for
 * @param availableFields All available field names from the data view
 * @returns Array of metric field names that match the entity's prefixes
 */
export const findMetricsForEntity = (
  entity: EntityDefinition,
  availableFields: string[]
): string[] => {
  const metricPrefixes = entity.metricPrefixes ?? [];
  if (metricPrefixes.length === 0) {
    return [];
  }

  return availableFields.filter((field) =>
    metricPrefixes.some((prefix) => field.startsWith(prefix))
  );
};

/**
 * Get all metric prefixes from all entity definitions
 * Useful for understanding which metrics are semantically mapped
 */
export const getAllMetricPrefixes = (): string[] => {
  const prefixes = new Set<string>();
  for (const entity of ENTITY_DEFINITIONS) {
    if (entity.metricPrefixes) {
      for (const prefix of entity.metricPrefixes) {
        prefixes.add(prefix);
      }
    }
  }
  return Array.from(prefixes).sort();
};
