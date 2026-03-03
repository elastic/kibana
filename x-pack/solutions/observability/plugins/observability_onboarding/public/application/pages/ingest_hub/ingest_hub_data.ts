/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOGO_FALLBACK = 'https://www.vectorlogo.zone/logos';

export const ELASTIC_LOGOS =
  'https://raw.githubusercontent.com/elastic/integrations/main/packages';

export interface IntegrationTile {
  id: string;
  name: string;
  description: string;
  logoDomain: string;
  logoUrl?: string;
}

export interface IntegrationSection {
  title: string;
  description: string;
  icon: string;
  tiles: IntegrationTile[];
}

export const SECTIONS: IntegrationSection[] = [
  {
    title: 'Cloud',
    description: 'Monitor your cloud infrastructure',
    icon: 'cloud',
    tiles: [
      {
        id: 'aws',
        name: 'Amazon Web Services',
        description: 'Collect logs and metrics from AWS services.',
        logoDomain: 'aws.amazon.com',
        logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_aws.svg`,
      },
      {
        id: 'gcp',
        name: 'Google Cloud Platform',
        description: 'Monitor Google Cloud operations and resources.',
        logoDomain: 'cloud.google.com',
        logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg`,
      },
      {
        id: 'azure',
        name: 'Azure',
        description: 'Centralize Azure monitoring and alerting.',
        logoDomain: 'azure.microsoft.com',
        logoUrl: `${ELASTIC_LOGOS}/azure/img/logo_azure.svg`,
      },
    ],
  },
  {
    title: 'Containers',
    description: 'Monitor your containerised environments',
    icon: 'package',
    tiles: [
      {
        id: 'kubernetes',
        name: 'Kubernetes',
        description: 'Monitor pod health, resources, and deployments.',
        logoDomain: 'kubernetes.io',
        logoUrl: `${ELASTIC_LOGOS}/kubernetes/img/logo_kubernetes.svg`,
      },
      {
        id: 'docker',
        name: 'Docker',
        description: 'Collect container logs and metrics.',
        logoDomain: 'docker.com',
        logoUrl: `${ELASTIC_LOGOS}/docker/img/logo_docker.svg`,
      },
      {
        id: 'ecs',
        name: 'Amazon ECS',
        description: 'Track ECS and Fargate task metrics.',
        logoDomain: 'aws.amazon.com',
        logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ecs.svg`,
      },
    ],
  },
  {
    title: 'Host',
    description: 'Monitor your physical or virtual servers',
    icon: 'compute',
    tiles: [
      {
        id: 'linux',
        name: 'Linux',
        description: 'Collect system metrics and logs from Linux servers.',
        logoDomain: 'linuxfoundation.org',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg',
      },
      {
        id: 'windows',
        name: 'Windows',
        description: 'Monitor event logs and performance counters.',
        logoDomain: 'microsoft.com',
        logoUrl: `${ELASTIC_LOGOS}/windows/img/logo_windows.svg`,
      },
      {
        id: 'macos',
        name: 'macOS',
        description: 'Collect logs and metrics from macOS endpoints.',
        logoDomain: 'apple.com',
        logoUrl: `${ELASTIC_LOGOS}/macos/img/macos-logo.svg`,
      },
    ],
  },
  {
    title: 'Applications',
    description: 'Monitor your application performance and logs',
    icon: 'apmTrace',
    tiles: [
      {
        id: 'opentelemetry',
        name: 'OpenTelemetry',
        description: 'Send traces, metrics, and logs via OTel SDK.',
        logoDomain: 'opentelemetry.io',
        logoUrl: 'https://opentelemetry.io/img/logos/opentelemetry-logo-nav.png',
      },
      {
        id: 'prometheus',
        name: 'Prometheus',
        description: 'Scrape and visualize Prometheus metrics.',
        logoDomain: 'prometheus.io',
        logoUrl: `${ELASTIC_LOGOS}/prometheus/img/logo_prometheus.svg`,
      },
      {
        id: 'fluentbit',
        name: 'Fluent Bit',
        description: 'Forward logs from any source via Fluent Bit.',
        logoDomain: 'fluentbit.io',
        logoUrl: `${LOGO_FALLBACK}/fluentd/fluentd-icon.svg`,
      },
    ],
  },
];

export const SAAS_TILES: IntegrationTile[] = [
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Index and search Confluence spaces, pages, and blog posts.',
    logoDomain: 'atlassian.com',
    logoUrl: `${ELASTIC_LOGOS}/atlassian_confluence/img/confluence-logo.svg`,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Collect Salesforce events, objects, and login activity.',
    logoDomain: 'salesforce.com',
    logoUrl: `${ELASTIC_LOGOS}/salesforce/img/salesforce.svg`,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Monitor Slack workspace audit logs and messages.',
    logoDomain: 'slack.com',
    logoUrl: `${ELASTIC_LOGOS}/slack/img/slack.svg`,
  },
];

export const EXPAND_STACK_TILES: IntegrationTile[] = [
  { id: 'nginx', name: 'Nginx', description: 'Collect Nginx access and error logs and metrics.', logoDomain: 'nginx.org', logoUrl: `${ELASTIC_LOGOS}/nginx/img/logo_nginx.svg` },
  { id: 'redis', name: 'Redis', description: 'Monitor Redis performance and memory usage.', logoDomain: 'redis.io', logoUrl: `${ELASTIC_LOGOS}/redis/img/logo_redis.svg` },
  { id: 'postgresql', name: 'PostgreSQL', description: 'Track PostgreSQL queries and database health.', logoDomain: 'postgresql.org', logoUrl: `${ELASTIC_LOGOS}/postgresql/img/logo_postgresql.svg` },
  { id: 'mysql', name: 'MySQL', description: 'Monitor MySQL server performance and queries.', logoDomain: 'mysql.com', logoUrl: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg` },
  { id: 'rabbitmq', name: 'RabbitMQ', description: 'Collect RabbitMQ queue and node metrics.', logoDomain: 'rabbitmq.com', logoUrl: `${ELASTIC_LOGOS}/rabbitmq/img/logo_rabbitmq.svg` },
  { id: 'mongodb', name: 'MongoDB', description: 'Monitor MongoDB replica sets and performance.', logoDomain: 'mongodb.com', logoUrl: `${ELASTIC_LOGOS}/mongodb/img/logo_mongodb.svg` },
];

export const OBSERVABILITY_INTEGRATIONS: IntegrationTile[] = [
  { id: 'activemq', name: 'ActiveMQ', description: 'Collect ActiveMQ logs and metrics.', logoDomain: 'activemq.apache.org', logoUrl: `${ELASTIC_LOGOS}/activemq/img/logo_activemq.svg` },
  { id: 'airflow', name: 'Airflow', description: 'Monitor Airflow DAGs and tasks.', logoDomain: 'airflow.apache.org', logoUrl: `${ELASTIC_LOGOS}/airflow/img/logo_airflow.svg` },
  { id: 'amazon_bedrock', name: 'Amazon Bedrock', description: 'Track Bedrock model invocations and metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws_bedrock/img/logo_bedrock.svg` },
  { id: 'amazon_cloudfront', name: 'Amazon CloudFront', description: 'Collect CloudFront access logs.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudfront.svg` },
  { id: 'amazon_data_firehose', name: 'Amazon Data Firehose', description: 'Stream data from Firehose into Elastic.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/awsfirehose/img/logo_firehose.svg` },
  { id: 'amazon_dynamodb', name: 'Amazon DynamoDB', description: 'Collect DynamoDB table metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_dynamodb.svg` },
  { id: 'amazon_ebs', name: 'Amazon EBS', description: 'Monitor EBS volume metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ebs.svg` },
  { id: 'amazon_ec2', name: 'Amazon EC2', description: 'Collect EC2 instance logs and metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ec2.svg` },
  { id: 'amazon_ecs', name: 'Amazon ECS', description: 'Monitor ECS container service metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ecs.svg` },
  { id: 'amazon_emr', name: 'Amazon EMR', description: 'Collect EMR cluster logs and metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_emr.svg` },
  { id: 'amazon_guardduty', name: 'Amazon GuardDuty', description: 'Ingest GuardDuty threat findings.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_guardduty.svg` },
  { id: 'amazon_inspector', name: 'Amazon Inspector', description: 'Collect Inspector vulnerability findings.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_inspector.svg` },
  { id: 'amazon_kinesis', name: 'Amazon Kinesis Data Stream', description: 'Monitor Kinesis stream metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_kinesis.svg` },
  { id: 'amazon_msk', name: 'Amazon MSK', description: 'Collect managed Kafka metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_msk.svg` },
  { id: 'amazon_mq', name: 'Amazon MQ', description: 'Monitor Amazon MQ broker metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_mq.svg` },
  { id: 'amazon_nat_gateway', name: 'Amazon NAT Gateway', description: 'Track NAT Gateway traffic metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_nat_gateway.svg` },
  { id: 'amazon_rds', name: 'Amazon RDS', description: 'Collect RDS database metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_rds.svg` },
  { id: 'amazon_redshift', name: 'Amazon Redshift', description: 'Monitor Redshift cluster metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_redshift.svg` },
  { id: 'amazon_route53', name: 'Amazon Route 53', description: 'Collect Route 53 DNS logs and metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_route53.svg` },
  { id: 'amazon_s3', name: 'Amazon S3', description: 'Monitor S3 bucket metrics and access logs.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_s3.svg` },
  { id: 'amazon_sns', name: 'Amazon SNS', description: 'Collect SNS notification metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_sns.svg` },
  { id: 'amazon_sqs', name: 'Amazon SQS', description: 'Monitor SQS queue metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_sqs.svg` },
  { id: 'amazon_vpc_flow', name: 'Amazon VPC Flow Logs', description: 'Collect VPC network flow logs.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_vpcflow.svg` },
  { id: 'apache', name: 'Apache HTTP Server', description: 'Monitor Apache server logs and metrics.', logoDomain: 'httpd.apache.org', logoUrl: `${ELASTIC_LOGOS}/apache/img/logo_apache.svg` },
  { id: 'apm', name: 'APM', description: 'Monitor app performance with traces and metrics.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/apm/img/logo_apm.svg` },
  { id: 'azure_monitor', name: 'Azure Monitor', description: 'Collect Azure Monitor metrics and logs.', logoDomain: 'azure.microsoft.com', logoUrl: `${ELASTIC_LOGOS}/azure/img/logo_azure.svg` },
  { id: 'azure_app_service', name: 'Azure App Service', description: 'Monitor App Service logs and metrics.', logoDomain: 'azure.microsoft.com', logoUrl: `${ELASTIC_LOGOS}/azure/img/logo_azure.svg` },
  { id: 'cassandra', name: 'Cassandra', description: 'Collect Cassandra logs and metrics.', logoDomain: 'cassandra.apache.org', logoUrl: `${ELASTIC_LOGOS}/cassandra/img/logo_cassandra.svg` },
  { id: 'ceph', name: 'Ceph', description: 'Monitor Ceph storage cluster metrics.', logoDomain: 'ceph.io', logoUrl: `${ELASTIC_LOGOS}/ceph/img/logo_ceph.svg` },
  { id: 'consul', name: 'Consul', description: 'Collect Consul service mesh metrics.', logoDomain: 'consul.io', logoUrl: `${ELASTIC_LOGOS}/consul/img/logo_consul.svg` },
  { id: 'docker-int', name: 'Docker', description: 'Collect container logs and metrics.', logoDomain: 'docker.com', logoUrl: `${ELASTIC_LOGOS}/docker/img/logo_docker.svg` },
  { id: 'elasticsearch-int', name: 'Elasticsearch', description: 'Monitor Elasticsearch cluster health.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/elasticsearch/img/logo_elasticsearch.svg` },
  { id: 'etcd', name: 'Etcd', description: 'Collect Etcd key-value store metrics.', logoDomain: 'etcd.io', logoUrl: `${ELASTIC_LOGOS}/etcd/img/logo_etcd.svg` },
  { id: 'gcp_pubsub', name: 'Google Cloud Pub/Sub', description: 'Monitor Pub/Sub topic metrics.', logoDomain: 'cloud.google.com', logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg` },
  { id: 'gcp_compute', name: 'Google Compute Engine', description: 'Collect Compute Engine instance metrics.', logoDomain: 'cloud.google.com', logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg` },
  { id: 'haproxy', name: 'HAProxy', description: 'Monitor HAProxy load balancer metrics.', logoDomain: 'haproxy.org', logoUrl: `${ELASTIC_LOGOS}/haproxy/img/logo_haproxy.svg` },
  { id: 'iis', name: 'IIS', description: 'Collect IIS web server logs and metrics.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/iis/img/logo_iis.svg` },
  { id: 'kafka', name: 'Kafka', description: 'Monitor Kafka broker logs and metrics.', logoDomain: 'kafka.apache.org', logoUrl: `${ELASTIC_LOGOS}/kafka/img/logo_kafka.svg` },
  { id: 'kibana-int', name: 'Kibana', description: 'Monitor Kibana instance health.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/kibana/img/logo_kibana.svg` },
  { id: 'kubernetes-int', name: 'Kubernetes', description: 'Monitor clusters, pods, and deployments.', logoDomain: 'kubernetes.io', logoUrl: `${ELASTIC_LOGOS}/kubernetes/img/logo_kubernetes.svg` },
  { id: 'logstash', name: 'Logstash', description: 'Track Logstash pipeline metrics.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/logstash/img/logo_logstash.svg` },
  { id: 'memcached', name: 'Memcached', description: 'Collect Memcached cache metrics.', logoDomain: 'memcached.org', logoUrl: `${ELASTIC_LOGOS}/memcached/img/logo_memcached.svg` },
  { id: 'mongodb', name: 'MongoDB', description: 'Monitor MongoDB database metrics.', logoDomain: 'mongodb.com', logoUrl: `${ELASTIC_LOGOS}/mongodb/img/logo_mongodb.svg` },
  { id: 'mysql-int', name: 'MySQL', description: 'Collect MySQL database logs and metrics.', logoDomain: 'mysql.com', logoUrl: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg` },
  { id: 'nginx', name: 'Nginx', description: 'Monitor Nginx server logs and metrics.', logoDomain: 'nginx.org', logoUrl: `${ELASTIC_LOGOS}/nginx/img/logo_nginx.svg` },
  { id: 'opentelemetry-int', name: 'OpenTelemetry', description: 'Send traces, metrics, and logs via OTel.', logoDomain: 'opentelemetry.io', logoUrl: 'https://opentelemetry.io/img/logos/opentelemetry-logo-nav.png' },
  { id: 'postgresql', name: 'PostgreSQL', description: 'Collect PostgreSQL database metrics.', logoDomain: 'postgresql.org', logoUrl: `${ELASTIC_LOGOS}/postgresql/img/logo_postgresql.svg` },
  { id: 'prometheus-int', name: 'Prometheus', description: 'Scrape and visualize Prometheus metrics.', logoDomain: 'prometheus.io', logoUrl: `${ELASTIC_LOGOS}/prometheus/img/logo_prometheus.svg` },
  { id: 'rabbitmq', name: 'RabbitMQ', description: 'Monitor RabbitMQ queue metrics.', logoDomain: 'rabbitmq.com', logoUrl: `${ELASTIC_LOGOS}/rabbitmq/img/logo_rabbitmq.svg` },
  { id: 'redis', name: 'Redis', description: 'Collect Redis server metrics.', logoDomain: 'redis.io', logoUrl: `${ELASTIC_LOGOS}/redis/img/logo_redis.svg` },
  { id: 'system', name: 'System', description: 'Monitor host CPU, memory, and processes.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/system/img/logo_system.svg` },
  { id: 'traefik', name: 'Traefik', description: 'Collect Traefik proxy logs and metrics.', logoDomain: 'traefik.io', logoUrl: `${ELASTIC_LOGOS}/traefik/img/logo_traefik.svg` },
  { id: 'zookeeper', name: 'ZooKeeper', description: 'Monitor ZooKeeper ensemble metrics.', logoDomain: 'zookeeper.apache.org', logoUrl: `${ELASTIC_LOGOS}/zookeeper/img/logo_zookeeper.svg` },
];

export const PACKAGES: IntegrationTile[] = [
  { id: 'pkg-apache-otel', name: 'Apache HTTP Server', description: 'Collect Apache HTTP Server status metrics using OpenTelemetry Collector.', logoDomain: 'httpd.apache.org', logoUrl: `${ELASTIC_LOGOS}/apache/img/logo_apache.svg` },
  { id: 'pkg-custom-wmi', name: 'Custom WMI', description: 'Custom WMI Input Package.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/windows/img/logo_windows.svg` },
  { id: 'pkg-docker-otel', name: 'Docker', description: 'Collect Docker container metrics using OpenTelemetry Collector.', logoDomain: 'docker.com', logoUrl: `${ELASTIC_LOGOS}/docker/img/logo_docker.svg` },
  { id: 'pkg-host-metrics-otel', name: 'Host Metrics', description: 'Collect system metrics using OpenTelemetry Collector.', logoDomain: 'opentelemetry.io', logoUrl: 'https://opentelemetry.io/img/logos/opentelemetry-logo-nav.png' },
  { id: 'pkg-iis-otel', name: 'IIS', description: 'IIS OpenTelemetry Input Package.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/iis/img/logo_iis.svg` },
  { id: 'pkg-mysql-otel', name: 'MySQL', description: 'Collect MySQL metrics using OpenTelemetry Collector.', logoDomain: 'mysql.com', logoUrl: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg` },
  { id: 'pkg-nginx-otel', name: 'NGINX', description: 'NGINX OpenTelemetry Input Package.', logoDomain: 'nginx.org', logoUrl: `${ELASTIC_LOGOS}/nginx/img/logo_nginx.svg` },
  { id: 'pkg-redis-otel', name: 'Redis', description: 'Redis OpenTelemetry Input Package.', logoDomain: 'redis.io', logoUrl: `${ELASTIC_LOGOS}/redis/img/logo_redis.svg` },
  { id: 'pkg-statsd', name: 'StatsD', description: 'StatsD Input Package.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/statsd/img/logo_statsd.svg` },
  { id: 'pkg-statsd-otel', name: 'StatsD OTel', description: 'StatsD OpenTelemetry Input Package.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/statsd/img/logo_statsd.svg` },
];

export const PACKAGE_CATEGORY_MAP: Record<string, string[]> = {
  opentelemetry: ['pkg-apache-otel', 'pkg-docker-otel', 'pkg-host-metrics-otel', 'pkg-iis-otel', 'pkg-mysql-otel', 'pkg-nginx-otel', 'pkg-redis-otel', 'pkg-statsd-otel'],
  statsd: ['pkg-statsd', 'pkg-statsd-otel'],
  custom: ['pkg-custom-wmi'],
  'web-server': ['pkg-apache-otel', 'pkg-iis-otel', 'pkg-nginx-otel'],
  database: ['pkg-mysql-otel', 'pkg-redis-otel'],
  containers: ['pkg-docker-otel'],
  system: ['pkg-host-metrics-otel', 'pkg-custom-wmi'],
};

export const PACKAGE_CATEGORIES = [
  'OpenTelemetry',
  'StatsD',
  'Custom',
  'Web Server',
  'Database',
  'Containers',
  'System',
];

export const ASSET_TILES: IntegrationTile[] = [
  { id: 'asset-apache-otel', name: 'Apache', description: 'Apache status metrics from OpenTelemetry Collector.', logoDomain: 'httpd.apache.org', logoUrl: `${ELASTIC_LOGOS}/apache/img/logo_apache.svg` },
  { id: 'asset-aws-cloudtrail-otel', name: 'AWS CloudTrail', description: 'AWS CloudTrail Logs OpenTelemetry Assets.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudtrail.svg` },
  { id: 'asset-aws-elb-otel', name: 'AWS ELB', description: 'AWS ELB logs for OpenTelemetry Collector.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_elb.svg` },
  { id: 'asset-aws-vpc-otel', name: 'AWS VPC Flow Logs', description: 'AWS VPC Flow Logs OpenTelemetry Assets.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_vpcflow.svg` },
  { id: 'asset-aws-waf-otel', name: 'AWS WAF', description: 'AWS WAF Logs OpenTelemetry Assets.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_aws.svg` },
  { id: 'asset-cloud-discovery', name: 'Cloud Discovery', description: 'Discover and Create Cloud Assets Discovery.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/cloud_security_posture/img/logo_cloud.svg` },
  { id: 'asset-docker-otel', name: 'Docker', description: 'Pre-built dashboard for OTel-native metrics of Docker hosts and their running containers.', logoDomain: 'docker.com', logoUrl: `${ELASTIC_LOGOS}/docker/img/logo_docker.svg` },
  { id: 'asset-gcp-audit-otel', name: 'GCP Audit Logs', description: 'GCP Audit Logs OpenTelemetry Assets.', logoDomain: 'cloud.google.com', logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg` },
  { id: 'asset-gcp-vpc-otel', name: 'GCP VPC Flow Logs', description: 'GCP VPC Flow Logs OpenTelemetry Assets.', logoDomain: 'cloud.google.com', logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg` },
  { id: 'asset-iis-otel', name: 'IIS', description: 'IIS Assets for OpenTelemetry Collector.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/iis/img/logo_iis.svg` },
  { id: 'asset-k8s-otel', name: 'Kubernetes', description: 'Pre-built dashboard for OTel-native metrics and events collected from a Kubernetes cluster.', logoDomain: 'kubernetes.io', logoUrl: `${ELASTIC_LOGOS}/kubernetes/img/logo_kubernetes.svg` },
  { id: 'asset-mysql-otel', name: 'MySQL', description: 'MySQL metrics for OpenTelemetry Collector.', logoDomain: 'mysql.com', logoUrl: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg` },
  { id: 'asset-nginx-otel', name: 'NGINX', description: 'NGINX metrics from OpenTelemetry Collector.', logoDomain: 'nginx.org', logoUrl: `${ELASTIC_LOGOS}/nginx/img/logo_nginx.svg` },
  { id: 'asset-postgresql-otel', name: 'PostgreSQL', description: 'PostgreSQL Assets for OpenTelemetry Collector.', logoDomain: 'postgresql.org', logoUrl: `${ELASTIC_LOGOS}/postgresql/img/logo_postgresql.svg` },
  { id: 'asset-profiling-otel', name: 'Profiling Metrics', description: 'Create metrics from profiling data.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/profiler_agent/img/logo_profiling.svg` },
  { id: 'asset-rum-otel', name: 'RUM', description: 'RUM status metrics from OpenTelemetry JS SDKs.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/apm/img/logo_apm.svg` },
  { id: 'asset-system-otel', name: 'System', description: 'Dashboards for the OpenTelemetry data collected with the hostmetrics receiver.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/system/img/logo_system.svg` },
];

export const ASSET_CATEGORIES = [
  'OpenTelemetry',
  'AWS',
  'GCP',
  'Containers',
  'Web Server',
  'Database',
  'System',
  'Cloud',
];

export const CONNECTOR_TILES: IntegrationTile[] = [
  { id: 'conn-s3', name: 'Amazon S3', description: 'Use a connector to sync from your Amazon S3 data source.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_s3.svg` },
  { id: 'conn-azure-blob', name: 'Azure Blob Storage', description: 'Use a connector to sync from your Azure Blob Storage data source.', logoDomain: 'azure.microsoft.com', logoUrl: `${ELASTIC_LOGOS}/azure/img/logo_azure.svg` },
  { id: 'conn-box', name: 'Box', description: 'Use a connector to sync from your Box data source.', logoDomain: 'box.com', logoUrl: `${ELASTIC_LOGOS}/box_events/img/logo_box.svg` },
  { id: 'conn-confluence', name: 'Confluence', description: 'Use a connector to sync from your Confluence data source.', logoDomain: 'atlassian.com', logoUrl: `${ELASTIC_LOGOS}/atlassian_confluence/img/confluence-logo.svg` },
  { id: 'conn-dropbox', name: 'Dropbox', description: 'Use a connector to sync from your Dropbox data source.', logoDomain: 'dropbox.com', logoUrl: `${ELASTIC_LOGOS}/cloud_security_posture/img/logo_cloud.svg` },
  { id: 'conn-github', name: 'GitHub', description: 'Use a connector to sync data from your GitHub data source.', logoDomain: 'github.com', logoUrl: `${ELASTIC_LOGOS}/github/img/logo_github.svg` },
  { id: 'conn-gmail', name: 'Gmail', description: 'Use a connector to sync from your Gmail data source.', logoDomain: 'google.com', logoUrl: `${ELASTIC_LOGOS}/google_workspace/img/logo_google_workspace.svg` },
  { id: 'conn-gcs', name: 'Google Cloud Storage', description: 'Use a connector to sync from your Google Cloud Storage data source.', logoDomain: 'cloud.google.com', logoUrl: `${ELASTIC_LOGOS}/gcp/img/logo_gcp.svg` },
  { id: 'conn-gdrive', name: 'Google Drive', description: 'Use a connector to sync from your Google Drive data source.', logoDomain: 'google.com', logoUrl: `${ELASTIC_LOGOS}/google_workspace/img/logo_google_workspace.svg` },
  { id: 'conn-jira', name: 'Jira', description: 'Use a connector to sync from your Jira data source.', logoDomain: 'atlassian.com', logoUrl: `${ELASTIC_LOGOS}/atlassian_jira/img/jira-logo.svg` },
  { id: 'conn-mssql', name: 'Microsoft SQL', description: 'Use a connector to sync from your Microsoft SQL data source.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/microsoft/img/logo_microsoft.svg` },
  { id: 'conn-mongodb', name: 'MongoDB', description: 'Use a connector to sync from your MongoDB data source.', logoDomain: 'mongodb.com', logoUrl: `${ELASTIC_LOGOS}/mongodb/img/logo_mongodb.svg` },
  { id: 'conn-mysql', name: 'MySQL', description: 'Use a connector to sync from your MySQL data source.', logoDomain: 'mysql.com', logoUrl: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg` },
  { id: 'conn-network-drive', name: 'Network Drive', description: 'Use a connector to sync from your Network Drive data source.', logoDomain: 'elastic.co', logoUrl: `${ELASTIC_LOGOS}/network_traffic/img/logo_network.svg` },
  { id: 'conn-notion', name: 'Notion', description: 'Use a connector to sync from your Notion data source.', logoDomain: 'notion.so', logoUrl: `${ELASTIC_LOGOS}/cloud_security_posture/img/logo_cloud.svg` },
  { id: 'conn-onedrive', name: 'OneDrive', description: 'Use a connector to sync from your OneDrive data source.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/microsoft/img/logo_microsoft.svg` },
  { id: 'conn-oracle', name: 'Oracle', description: 'Use a connector to sync from your Oracle data source.', logoDomain: 'oracle.com', logoUrl: `${ELASTIC_LOGOS}/oracle/img/logo_oracle.svg` },
  { id: 'conn-outlook', name: 'Outlook', description: 'Use a connector to sync from your Outlook data source.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/microsoft/img/logo_microsoft.svg` },
  { id: 'conn-postgresql', name: 'PostgreSQL', description: 'Use a connector to sync from your PostgreSQL data source.', logoDomain: 'postgresql.org', logoUrl: `${ELASTIC_LOGOS}/postgresql/img/logo_postgresql.svg` },
  { id: 'conn-salesforce', name: 'Salesforce', description: 'Use a connector to sync from your Salesforce data source.', logoDomain: 'salesforce.com', logoUrl: `${ELASTIC_LOGOS}/salesforce/img/salesforce.svg` },
  { id: 'conn-servicenow', name: 'ServiceNow', description: 'Use a connector to sync from your ServiceNow data source.', logoDomain: 'servicenow.com', logoUrl: `${ELASTIC_LOGOS}/servicenow/img/logo_servicenow.svg` },
  { id: 'conn-sharepoint-online', name: 'SharePoint Online', description: 'Use a connector to sync from your SharePoint Online data source.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/microsoft/img/logo_microsoft.svg` },
  { id: 'conn-slack', name: 'Slack', description: 'Use a connector to sync from your Slack data source.', logoDomain: 'slack.com', logoUrl: `${ELASTIC_LOGOS}/slack/img/slack.svg` },
  { id: 'conn-zoom', name: 'Zoom', description: 'Use a connector to sync from your Zoom data source.', logoDomain: 'zoom.us', logoUrl: `${ELASTIC_LOGOS}/zoom/img/logo_zoom.svg` },
];

export const CONNECTOR_CATEGORIES = [
  'Cloud storage',
  'Database',
  'SaaS',
  'Productivity',
  'Communication',
  'Developer tools',
  'Security',
];

export const INTEGRATION_CATEGORIES = [
  'AWS',
  'Azure',
  'Cloud',
  'Config management',
  'Containers',
  'CRM',
  'Custom',
  'Database',
  'Elastic Stack',
  'Elasticsearch SDK',
  'Enterprise Search',
  'Google Cloud',
  'Network',
  'OpenTelemetry',
  'Operating Systems',
  'Productivity',
  'Analytics Engine',
  'Application',
  'Big Data',
  'Java',
  'Kubernetes',
  'Load Balancer',
  'Message Broker',
  'Monitoring',
  'Notification',
  'Process Manager',
  'Stream Processing',
  'Virtualization Platform',
  'Web Server',
];

export const INSTALLED_INTEGRATIONS = ['kubernetes', 'aws', 'confluence', 'salesforce', 'slack', 'jira'];

export interface RecommendationGroup {
  trigger: string;
  reason: string;
  tiles: IntegrationTile[];
}

const RECOMMENDATION_RULES: {
  match: (installed: string[]) => boolean;
  trigger: string;
  reason: string;
  tiles: IntegrationTile[];
}[] = [
  {
    match: (installed) => installed.includes('kubernetes'),
    trigger: 'Kubernetes',
    reason: 'Natural companions for your Kubernetes stack',
    tiles: [
      { id: 'rec-prometheus', name: 'Prometheus', description: 'Scrape and visualize Prometheus metrics from your K8s cluster.', logoDomain: 'prometheus.io', logoUrl: `${ELASTIC_LOGOS}/prometheus/img/logo_prometheus.svg` },
      { id: 'rec-fluentbit', name: 'Fluent Bit', description: 'Lightweight log forwarder optimized for Kubernetes.', logoDomain: 'fluentbit.io', logoUrl: `${LOGO_FALLBACK}/fluentd/fluentd-icon.svg` },
      { id: 'rec-otel', name: 'OpenTelemetry', description: 'Unified telemetry collection for traces, metrics, and logs.', logoDomain: 'opentelemetry.io', logoUrl: 'https://opentelemetry.io/img/logos/opentelemetry-logo-nav.png' },
      { id: 'rec-istio', name: 'Istio', description: 'Monitor service mesh traffic and mTLS across your cluster.', logoDomain: 'istio.io', logoUrl: `${ELASTIC_LOGOS}/istio/img/logo_istio.svg` },
      { id: 'rec-nginx-ingress', name: 'Nginx Ingress', description: 'Track ingress controller logs and performance.', logoDomain: 'nginx.org', logoUrl: `${ELASTIC_LOGOS}/nginx_ingress_controller/img/logo_nginx.svg` },
      { id: 'rec-etcd', name: 'Etcd', description: 'Monitor the distributed key-value store backing your cluster.', logoDomain: 'etcd.io', logoUrl: `${ELASTIC_LOGOS}/etcd/img/logo_etcd.svg` },
    ],
  },
  {
    match: (installed) => installed.includes('aws'),
    trigger: 'AWS',
    reason: 'Expand your AWS observability coverage',
    tiles: [
      { id: 'rec-ecs', name: 'Amazon ECS', description: 'Track ECS and Fargate task metrics.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ecs.svg` },
      { id: 'rec-cloudwatch', name: 'Amazon CloudWatch', description: 'Centralize CloudWatch metrics and alarms.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudwatch.svg` },
      { id: 'rec-rds', name: 'Amazon RDS', description: 'Monitor RDS database performance and health.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_rds.svg` },
      { id: 'rec-lambda', name: 'AWS Lambda', description: 'Collect invocation metrics and error logs from Lambda functions.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_lambda.svg` },
      { id: 'rec-s3', name: 'Amazon S3', description: 'Monitor S3 bucket metrics and access logs.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_s3.svg` },
      { id: 'rec-elb', name: 'Elastic Load Balancing', description: 'Track ALB/NLB request metrics and access logs.', logoDomain: 'aws.amazon.com', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_elb.svg` },
    ],
  },
  {
    match: (installed) => {
      const saasIds = ['confluence', 'salesforce', 'slack', 'jira', 'splunk', 'pagerduty', 'github', 'opsgenie'];
      return installed.filter((id) => saasIds.includes(id)).length >= 3;
    },
    trigger: 'SaaS Workflow',
    reason: 'Correlation tools for your organization\'s workflow',
    tiles: [
      { id: 'rec-pagerduty', name: 'PagerDuty', description: 'Route alerts and manage on-call incidents.', logoDomain: 'pagerduty.com', logoUrl: `${ELASTIC_LOGOS}/pagerduty/img/logo_pagerduty.svg` },
      { id: 'rec-opsgenie', name: 'Opsgenie', description: 'Centralize alerting and incident management.', logoDomain: 'opsgenie.com', logoUrl: `${ELASTIC_LOGOS}/opsgenie/img/logo_opsgenie.svg` },
      { id: 'rec-github', name: 'GitHub', description: 'Correlate code changes with incidents and deployments.', logoDomain: 'github.com', logoUrl: `${ELASTIC_LOGOS}/github/img/logo_github.svg` },
      { id: 'rec-teams', name: 'Microsoft Teams', description: 'Get observability alerts in your Teams channels.', logoDomain: 'microsoft.com', logoUrl: `${ELASTIC_LOGOS}/microsoft/img/logo_microsoft.svg` },
    ],
  },
];

export const getRecommendations = (installed: string[]): RecommendationGroup[] =>
  RECOMMENDATION_RULES.filter((rule) => rule.match(installed)).map((rule) => ({
    trigger: rule.trigger,
    reason: rule.reason,
    tiles: rule.tiles,
  }));

export const SECONDARY_NAV_ITEMS = [
  { id: 'get-started', label: 'Get started' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'api-endpoint', label: 'API Endpoint' },
];

export const MIGRATION_NAV_ITEMS = [
  { id: 'platform-migration', label: 'Platform Migration' },
  { id: 'migration-dashboards', label: 'Dashboards' },
  { id: 'migration-rules', label: 'Rules & Monitors' },
];
