/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const AWS = 'https://raw.githubusercontent.com/elastic/integrations/main/packages/aws/img';
const BEDROCK =
  'https://raw.githubusercontent.com/elastic/integrations/main/packages/aws_bedrock/img';
const BEDROCK_AGENTCORE =
  'https://raw.githubusercontent.com/elastic/integrations/main/packages/aws_bedrock_agentcore/img';
const FIREHOSE =
  'https://raw.githubusercontent.com/elastic/integrations/main/packages/awsfirehose/img';

export type ServiceCategory =
  | 'Infrastructure'
  | 'Security'
  | 'Performance'
  | 'Reliability'
  | 'Cost'
  | 'AI Ops'
  | 'Compliance'
  | 'Custom';

export const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  Infrastructure: 'default',
  Security: 'default',
  Performance: 'default',
  Reliability: 'default',
  Cost: 'default',
  'AI Ops': 'default',
  Compliance: 'default',
  Custom: 'default',
};

export interface AwsService {
  id: string;
  name: string;
  logoUrl: string;
  category: ServiceCategory;
  useCase: string;
  description: string;
  packageName: string;
  agentless?: boolean;
  badge?: string;
}

/**
 * AWS integration matrix rows marked V1 (observability onboarding AWS wizard Version 1 only).
 * @see aws_integration_matrix.ts
 */
export const AWS_SERVICES_VERSION1_MATRIX: AwsService[] = [
  {
    id: 'apigateway_logs',
    name: 'AWS API Gateway logs',
    logoUrl: `${AWS}/logo_apigateway.svg`,
    category: 'Performance',
    useCase: 'Ingest API Gateway access and execution logs',
    description:
      'Ship API Gateway access logs and execution logs from S3 or Amazon Data Firehose into Elastic for API traffic visibility.',
    packageName: 'aws',
  },
  {
    id: 'apigateway_metrics',
    name: 'AWS API Gateway metrics',
    logoUrl: `${AWS}/logo_apigateway.svg`,
    category: 'Performance',
    useCase: 'Monitor API latency, errors, and usage',
    description:
      'Collect API Gateway metrics via agentless polling to track latency, 4xx/5xx rates, and integration health.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'cloudfront_logs',
    name: 'AWS CloudFront',
    logoUrl: `${AWS}/logo_cloudfront.svg`,
    category: 'Reliability',
    useCase: 'Ingest CDN access logs from S3 or Firehose',
    description:
      'Centralize CloudFront standard and real-time logs to analyze cache hit rates, origin errors, and edge latency.',
    packageName: 'aws',
  },
  {
    id: 'cloudtrail',
    name: 'AWS CloudTrail',
    logoUrl: `${AWS}/logo_cloudtrail.svg`,
    category: 'Security',
    useCase: 'Audit AWS API activity across accounts',
    description:
      'Collect CloudTrail management and data events to investigate changes, detect misuse, and support compliance.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'cloudwatch_logs',
    name: 'AWS CloudWatch Logs',
    logoUrl: `${AWS}/logo_cloudwatch.svg`,
    category: 'Infrastructure',
    useCase: 'Stream log groups via Amazon Data Firehose',
    description:
      'Ingest CloudWatch log groups by delivery stream or prefix to correlate application and platform logs in Elastic.',
    packageName: 'aws',
  },
  {
    id: 'cloudwatch_metrics',
    name: 'AWS CloudWatch Metrics',
    logoUrl: `${AWS}/logo_cloudwatch.svg`,
    category: 'Infrastructure',
    useCase: 'Agentless metrics for AWS namespaces',
    description:
      'Poll CloudWatch metrics for selected namespaces and regions without agents to monitor AWS service health.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'config',
    name: 'AWS Config',
    logoUrl: `${AWS}/logo-aws-config.svg`,
    category: 'Compliance',
    useCase: 'Track configuration changes and compliance',
    description:
      'Ingest AWS Config snapshots and change notifications to detect drift and misconfigurations.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'dynamodb',
    name: 'AWS DynamoDB',
    logoUrl: `${AWS}/logo_dynamodb.svg`,
    category: 'Performance',
    useCase: 'Monitor table throughput and throttles',
    description:
      'Collect DynamoDB metrics for read/write capacity, throttled requests, and hot partitions.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'ec2_logs',
    name: 'AWS EC2 logs',
    logoUrl: `${AWS}/logo_ec2.svg`,
    category: 'Infrastructure',
    useCase: 'Ingest EC2 system and application logs',
    description:
      'Ship EC2 logs from CloudWatch log groups or S3 to correlate host and workload issues with metrics.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'ec2_metrics',
    name: 'AWS EC2 metrics',
    logoUrl: `${AWS}/logo_ec2.svg`,
    category: 'Infrastructure',
    useCase: 'Monitor CPU, network, and disk on instances',
    description:
      'Collect EC2 instance metrics agentlessly to spot overloaded hosts and capacity constraints.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'ecs_metrics',
    name: 'AWS ECS metrics',
    logoUrl: `${AWS}/logo_ecs.svg`,
    category: 'Infrastructure',
    useCase: 'Track task CPU, memory, and service health',
    description:
      'Observe ECS cluster and service metrics to find failing tasks and resource pressure.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'elb_logs',
    name: 'AWS ELB logs',
    logoUrl: `${AWS}/logo_elb.svg`,
    category: 'Reliability',
    useCase: 'Ingest load balancer access logs',
    description:
      'Centralize ALB/NLB/CLB access logs from S3 or Firehose for latency and error analysis.',
    packageName: 'aws',
  },
  {
    id: 'elb_metrics',
    name: 'AWS ELB metrics',
    logoUrl: `${AWS}/logo_elb.svg`,
    category: 'Reliability',
    useCase: 'Monitor target health and response codes',
    description:
      'Collect ELB metrics for unhealthy hosts, latency, and HTTP errors across load balancers.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'emr_logs',
    name: 'AWS EMR logs',
    logoUrl: `${AWS}/logo_emr.svg`,
    category: 'Infrastructure',
    useCase: 'Ingest EMR log output from S3 or CloudWatch',
    description:
      'Bring EMR step and application logs into Elastic to debug jobs and cluster failures.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'emr_metrics',
    name: 'AWS EMR metrics',
    logoUrl: `${AWS}/logo_emr.svg`,
    category: 'Infrastructure',
    useCase: 'Monitor cluster utilization and job progress',
    description:
      'Track EMR metrics for HDFS, YARN, and applications to optimize big data workloads.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'firewall_logs',
    name: 'AWS Network Firewall logs',
    logoUrl: `${AWS}/logo_firewall.svg`,
    category: 'Security',
    useCase: 'Ingest firewall flow and alert logs',
    description:
      'Collect Network Firewall logs from S3 or Firehose to review blocks and VPC perimeter threats.',
    packageName: 'aws',
  },
  {
    id: 'firewall_metrics',
    name: 'AWS Network Firewall metrics',
    logoUrl: `${AWS}/logo_firewall.svg`,
    category: 'Security',
    useCase: 'Monitor firewall capacity and dropped packets',
    description:
      'Observe Network Firewall metrics for dropped traffic and capacity across VPC endpoints.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'guardduty',
    name: 'AWS GuardDuty',
    logoUrl: `${AWS}/logo_guardduty.svg`,
    category: 'Security',
    useCase: 'Centralize threat and anomaly findings',
    description:
      'Ingest GuardDuty findings for compromised credentials, unusual API activity, and malware.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'inspector',
    name: 'AWS Inspector',
    logoUrl: `${AWS}/logo_inspector.svg`,
    category: 'Security',
    useCase: 'Surface vulnerability and network reachability findings',
    description:
      'Collect Amazon Inspector findings to prioritize CVEs and exposure across EC2 and ECR workloads.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'kafka_metrics',
    name: 'AWS MSK Kafka metrics',
    logoUrl: `${AWS}/logo_msk.svg`,
    category: 'Reliability',
    useCase: 'Monitor broker health and consumer lag',
    description: 'Track MSK metrics for under-replicated partitions, disk, and consumer group lag.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'kinesis',
    name: 'AWS Kinesis',
    logoUrl: `${AWS}/logo_kinesis.svg`,
    category: 'Reliability',
    useCase: 'Monitor stream throughput and iterator age',
    description: 'Collect Kinesis Data Streams metrics to detect throttling and consumer lag.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'lambda',
    name: 'AWS Lambda metrics',
    logoUrl: `${AWS}/logo_lambda.svg`,
    category: 'Performance',
    useCase: 'Monitor invocations, errors, and duration',
    description: 'Collect Lambda metrics for cold starts, throttles, and concurrent executions.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'lambda_logs',
    name: 'AWS Lambda logs',
    logoUrl: `${AWS}/logo_lambda.svg`,
    category: 'Performance',
    useCase: 'Ingest function logs from CloudWatch',
    description:
      'Ship Lambda log groups to Elastic to correlate errors and slow invocations with traces.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'natgateway',
    name: 'AWS NAT Gateway',
    logoUrl: `${AWS}/logo_vpcflow.svg`,
    category: 'Infrastructure',
    useCase: 'Track egress usage and errors',
    description:
      'Observe NAT Gateway metrics for bytes, packets, and errors to control data transfer cost.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'rds',
    name: 'AWS RDS',
    logoUrl: `${AWS}/logo_rds.svg`,
    category: 'Performance',
    useCase: 'Monitor connections, storage, and performance',
    description: 'Collect RDS metrics for CPU, free storage, IOPS, and replica lag across engines.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 's3_daily_storage',
    name: 'AWS S3 storage metrics',
    logoUrl: `${AWS}/logo_s3.svg`,
    category: 'Cost',
    useCase: 'Track bucket size and object counts',
    description:
      'Ingest S3 daily storage metrics to find growth hotspots and optimize storage classes.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'securityhub_findings',
    name: 'AWS Security Hub findings',
    logoUrl: `${AWS}/logo_securityhub.svg`,
    category: 'Security',
    useCase: 'Aggregate normalized security findings',
    description:
      'Centralize ASFF findings from integrated AWS services for triage and correlation in Elastic.',
    packageName: 'aws',
  },
  {
    id: 'securityhub_findings_full_posture',
    name: 'AWS Security Hub full posture CSPM',
    logoUrl: `${AWS}/logo_securityhub.svg`,
    category: 'Compliance',
    useCase: 'Cloud security posture and compliance controls',
    description:
      'Ingest Security Hub CSPM and posture findings to identify misconfigurations across accounts.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'securityhub_insights',
    name: 'AWS Security Hub insights',
    logoUrl: `${AWS}/logo_securityhub.svg`,
    category: 'Security',
    useCase: 'Track insight results and trends',
    description:
      'Bring Security Hub insight results into Elastic for prioritized investigation workflows.',
    packageName: 'aws',
  },
  {
    id: 'waf',
    name: 'AWS WAF',
    logoUrl: `${AWS}/logo_waf.svg`,
    category: 'Security',
    useCase: 'Ingest WAF logs and blocked requests',
    description:
      'Collect AWS WAF logs to analyze blocked clients, rule matches, and application attacks.',
    packageName: 'aws',
  },
  {
    id: 'bedrock_guardrails',
    name: 'AWS Bedrock Guardrails',
    logoUrl: `${BEDROCK}/icon.svg`,
    category: 'AI Ops',
    useCase: 'Monitor guardrail invocations and policy outcomes',
    description:
      'Observe Bedrock Guardrails metrics for blocked prompts and policy violations in generative AI workloads.',
    packageName: 'aws_bedrock',
    agentless: true,
    badge: 'Technical preview',
  },
  {
    id: 'bedrock_knowledgebases',
    name: 'AWS Bedrock Knowledge bases',
    logoUrl: `${BEDROCK}/icon.svg`,
    category: 'AI Ops',
    useCase: 'Track retrieval and indexing health',
    description:
      'Collect metrics for Bedrock Knowledge Bases to monitor ingestion jobs and query performance.',
    packageName: 'aws_bedrock',
    agentless: true,
    badge: 'Technical preview',
  },
  {
    id: 'bedrock_runtime',
    name: 'AWS Bedrock Runtime',
    logoUrl: `${BEDROCK}/icon.svg`,
    category: 'AI Ops',
    useCase: 'Monitor model invocations and latency',
    description:
      'Ingest Bedrock runtime metrics for token usage, errors, and latency across foundation models.',
    packageName: 'aws_bedrock',
    agentless: true,
    badge: 'Technical preview',
  },
  {
    id: 'bedrock_agent_core',
    name: 'AWS Bedrock Agent Core',
    logoUrl: `${BEDROCK_AGENTCORE}/amazon_bedrock_agentcore.svg`,
    category: 'AI Ops',
    useCase: 'Observe agent runtime and tool execution',
    description:
      'Collect Bedrock Agent Core metrics for gateway traffic, memory access, and tool usage.',
    packageName: 'aws_bedrock_agent_core',
    agentless: true,
    badge: 'Technical preview',
  },
];

/** Log pipeline integrations for Version 1 browse tab (matrix `signalType` = logs). */
export const AWS_VERSION1_LOGS_SERVICE_IDS: readonly string[] = [
  'apigateway_logs',
  'cloudfront_logs',
  'cloudtrail',
  'cloudwatch_logs',
  'config',
  'ec2_logs',
  'elb_logs',
  'emr_logs',
  'firewall_logs',
  'guardduty',
  'inspector',
  'lambda_logs',
  'securityhub_findings',
  'securityhub_findings_full_posture',
  'securityhub_insights',
  'waf',
];

export const AWS_VERSION1_LOGS_ID_SET: ReadonlySet<string> = new Set(AWS_VERSION1_LOGS_SERVICE_IDS);

export const AWS_SERVICES: AwsService[] = [
  // ── Amazon prefixed ──
  {
    id: 'amazon_bedrock',
    name: 'Amazon Bedrock',
    logoUrl: `${BEDROCK}/icon.svg`,
    category: 'AI Ops',
    useCase: 'Track AI model usage, costs & latency across invocations',
    description:
      'Monitor model invocation rates, token consumption, error rates, and latency to control AI spend and catch failures early.',
    packageName: 'aws_bedrock',
  },
  {
    id: 'amazon_bedrock_agentcore',
    name: 'Amazon Bedrock AgentCore',
    logoUrl: `${BEDROCK_AGENTCORE}/amazon_bedrock_agentcore.svg`,
    category: 'AI Ops',
    useCase: 'Monitor AI agent health, memory & tool execution',
    description:
      'Observe agent runtime health, gateway traffic, memory access patterns, and browser or code tool usage in real time.',
    packageName: 'aws_bedrock',
    badge: 'Technical preview',
  },
  {
    id: 'amazon_cloudfront',
    name: 'Amazon CloudFront',
    logoUrl: `${AWS}/logo_cloudfront.svg`,
    category: 'Performance',
    useCase: 'Debug CDN cache hit rates, latency & origin errors',
    description:
      'Identify slow edge locations, cache misses driving up origin load, and error spikes before end users are affected.',
    packageName: 'aws',
  },
  {
    id: 'amazon_firehose',
    name: 'Amazon Data Firehose',
    logoUrl: `${FIREHOSE}/logo_firehose.svg`,
    category: 'Reliability',
    useCase: 'Trace data pipeline throughput & delivery failures',
    description:
      'Detect delivery delays, throttling, and record failures in your Firehose streams before downstream consumers are impacted.',
    packageName: 'awsfirehose',
  },
  {
    id: 'amazon_dynamodb',
    name: 'Amazon DynamoDB',
    logoUrl: `${AWS}/logo_dynamodb.svg`,
    category: 'Performance',
    useCase: 'Spot query throttling, hot partitions & capacity waste',
    description:
      'Catch read/write throttles, identify hot partition keys, and right-size provisioned capacity to reduce costs.',
    packageName: 'aws',
  },
  {
    id: 'amazon_ebs',
    name: 'Amazon EBS',
    logoUrl: `${AWS}/logo_aws.svg`,
    category: 'Infrastructure',
    useCase: 'Monitor disk I/O bottlenecks & volume health',
    description:
      'Detect IOPS saturation, high queue depth, and volume stall events that degrade application performance.',
    packageName: 'aws',
  },
  {
    id: 'amazon_ec2',
    name: 'Amazon EC2',
    logoUrl: `${AWS}/logo_ec2.svg`,
    category: 'Infrastructure',
    useCase: 'Monitor CPU, memory, disk & network across instances',
    description:
      'Get a unified view of all your EC2 instances to spot overloaded hosts, unused capacity, and network anomalies.',
    packageName: 'aws',
  },
  {
    id: 'amazon_ecs',
    name: 'Amazon ECS',
    logoUrl: `${AWS}/logo_ecs.svg`,
    category: 'Infrastructure',
    useCase: 'Track container CPU, memory & task health',
    description:
      'Identify OOM-killed tasks, over-provisioned services, and unhealthy task counts across your ECS clusters.',
    packageName: 'aws',
  },
  {
    id: 'amazon_emr',
    name: 'Amazon EMR',
    logoUrl: `${AWS}/logo_emr.svg`,
    category: 'Performance',
    useCase: 'Monitor Hadoop/Spark job duration & cluster utilization',
    description:
      'Catch long-running jobs, failed steps, and underutilized clusters to optimize big data processing costs.',
    packageName: 'aws',
  },
  {
    id: 'amazon_guardduty',
    name: 'Amazon GuardDuty',
    logoUrl: `${AWS}/logo_guardduty.svg`,
    category: 'Security',
    useCase: 'Detect threats, suspicious activity & account compromise',
    description:
      'Centralize GuardDuty findings to identify brute-force attempts, credential misuse, and unusual API calls in one place.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'amazon_inspector',
    name: 'Amazon Inspector',
    logoUrl: `${AWS}/logo_inspector.svg`,
    category: 'Security',
    useCase: 'Find software vulnerabilities in EC2 & containers',
    description:
      'Surface CVEs in your running workloads automatically and prioritize patching by severity before exploits occur.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'amazon_kinesis',
    name: 'Amazon Kinesis Data Stream',
    logoUrl: `${AWS}/logo_kinesis.svg`,
    category: 'Reliability',
    useCase: 'Monitor stream throughput, lag & shard utilization',
    description:
      'Detect consumer lag, shard hotspots, and iterator age growth that signal a stream falling behind producers.',
    packageName: 'aws',
  },
  {
    id: 'amazon_msk',
    name: 'Amazon MSK',
    logoUrl: `${AWS}/logo_msk.svg`,
    category: 'Reliability',
    useCase: 'Track Kafka broker health, consumer lag & throughput',
    description:
      'Monitor broker disk usage, under-replicated partitions, and consumer group lag to keep your Kafka clusters healthy.',
    packageName: 'aws',
  },
  {
    id: 'amazon_mq',
    name: 'Amazon MQ',
    logoUrl: `${AWS}/logo_msk.svg`,
    category: 'Reliability',
    useCase: 'Monitor message broker health & queue depth',
    description:
      'Detect growing queues, high memory pressure, and connection drops before they block message delivery.',
    packageName: 'aws',
  },
  {
    id: 'amazon_natgateway',
    name: 'Amazon NAT Gateway',
    logoUrl: `${AWS}/logo_vpcflow.svg`,
    category: 'Infrastructure',
    useCase: 'Track bandwidth usage & connection errors per subnet',
    description:
      'Identify subnets driving high egress costs and catch error packet spikes that indicate misconfigured routes.',
    packageName: 'aws',
  },
  {
    id: 'amazon_rds',
    name: 'Amazon RDS',
    logoUrl: `${AWS}/logo_rds.svg`,
    category: 'Performance',
    useCase: 'Monitor query performance, connections & storage',
    description:
      'Spot slow queries, connection exhaustion, and low free storage before they cause database outages.',
    packageName: 'aws',
  },
  {
    id: 'amazon_redshift',
    name: 'Amazon Redshift',
    logoUrl: `${AWS}/logo_aws.svg`,
    category: 'Performance',
    useCase: 'Track query execution time & cluster utilization',
    description:
      'Identify long-running queries, high disk usage, and concurrency scaling events to keep your data warehouse fast.',
    packageName: 'aws',
  },
  {
    id: 'amazon_s3',
    name: 'Amazon S3',
    logoUrl: `${AWS}/logo_s3.svg`,
    category: 'Security',
    useCase: 'Audit bucket access, spot anomalous requests & errors',
    description:
      'Detect unexpected public access, unusual download volumes, and 4xx/5xx spikes that could signal a data leak or attack.',
    packageName: 'aws',
  },
  {
    id: 'amazon_s3_storage_lens',
    name: 'Amazon S3 Storage Lens',
    logoUrl: `${AWS}/logo_s3.svg`,
    category: 'Cost',
    useCase: 'Get org-wide S3 usage insights to reduce storage costs',
    description:
      'Identify stale buckets, redundant objects, and inefficient storage classes across every account in your organization.',
    packageName: 'aws',
  },
  {
    id: 'amazon_sns',
    name: 'Amazon SNS',
    logoUrl: `${AWS}/logo_aws.svg`,
    category: 'Reliability',
    useCase: 'Track notification delivery rates & subscription failures',
    description:
      'Catch message delivery failures and throttling across topics before downstream subscribers miss critical events.',
    packageName: 'aws',
  },
  {
    id: 'amazon_sqs',
    name: 'Amazon SQS',
    logoUrl: `${AWS}/logo_aws.svg`,
    category: 'Reliability',
    useCase: 'Monitor queue depth & message age to prevent backlogs',
    description:
      'Alert on growing queues and messages approaching visibility timeout to avoid losing work or blocking consumers.',
    packageName: 'aws',
  },
  {
    id: 'amazon_vpc',
    name: 'Amazon VPC',
    logoUrl: `${AWS}/logo_vpcflow.svg`,
    category: 'Security',
    useCase: 'Analyze network flows & detect anomalous traffic',
    description:
      'Trace unexpected inter-subnet traffic, detect port scanning, and investigate rejected connections from VPC flow logs.',
    packageName: 'aws',
  },
  {
    id: 'amazon_vpn',
    name: 'Amazon VPN',
    logoUrl: `${AWS}/logo_aws.svg`,
    category: 'Infrastructure',
    useCase: 'Monitor tunnel status & connectivity health',
    description:
      'Get alerted on tunnel state changes and packet loss before remote offices or hybrid workloads lose connectivity.',
    packageName: 'aws',
  },
  // ── AWS prefixed ──
  {
    id: 'aws_apigateway',
    name: 'AWS API Gateway',
    logoUrl: `${AWS}/logo_apigateway.svg`,
    category: 'Performance',
    useCase: 'Track API latency, error rates & usage by endpoint',
    description:
      'Identify slow or error-prone API routes, throttled clients, and integration timeout patterns across your APIs.',
    packageName: 'aws',
  },
  {
    id: 'aws_billing',
    name: 'AWS Billing',
    logoUrl: `${AWS}/logo_aws.svg`,
    category: 'Cost',
    useCase: 'Visualize cost trends & catch unexpected spend early',
    description:
      'Set up alerts on billing anomalies and correlate cost spikes with infrastructure events to keep budgets on track.',
    packageName: 'aws',
  },
  {
    id: 'aws_cloudtrail',
    name: 'AWS CloudTrail',
    logoUrl: `${AWS}/logo_cloudtrail.svg`,
    category: 'Security',
    useCase: 'Audit every API call across your AWS account',
    description:
      'Build a complete audit trail for compliance, investigate unauthorized changes, and detect credential misuse.',
    packageName: 'aws',
  },
  {
    id: 'aws_cloudwatch',
    name: 'AWS CloudWatch',
    logoUrl: `${AWS}/logo_cloudwatch.svg`,
    category: 'Infrastructure',
    useCase: 'Pull EC2, RDS, Lambda, and other AWS metrics without agents',
    description:
      'Agentless collection uses identity federation (IAM role + OIDC): Elastic polls the CloudWatch Metrics API on a schedule—no agents, no long-lived AWS secrets stored in Elastic.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'aws_config',
    name: 'AWS Config',
    logoUrl: `${AWS}/logo-aws-config.svg`,
    category: 'Compliance',
    useCase: 'Track resource configuration changes & drift',
    description:
      'Detect when resources deviate from approved configurations and investigate who changed what and when.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'aws_elb',
    name: 'AWS ELB',
    logoUrl: `${AWS}/logo_elb.svg`,
    category: 'Reliability',
    useCase: 'Monitor load balancer health, latency & backend errors',
    description:
      'Catch unhealthy targets, high 5xx rates, and connection timeouts before they degrade user-facing availability.',
    packageName: 'aws',
  },
  {
    id: 'aws_fargate',
    name: 'AWS Fargate (for ECS clusters)',
    logoUrl: `${AWS}/logo_ecs.svg`,
    category: 'Infrastructure',
    useCase: 'Track serverless container CPU, memory & task failures',
    description:
      'Identify OOM-killed containers and CPU-throttled tasks without managing underlying EC2 infrastructure.',
    packageName: 'aws',
  },
  {
    id: 'aws_health',
    name: 'AWS Health',
    logoUrl: `${AWS}/logo_aws.svg`,
    category: 'Reliability',
    useCase: 'Get notified about AWS service incidents & maintenance',
    description:
      'Receive health events in Elastic before they impact workloads so you can act before users notice.',
    packageName: 'aws',
    badge: 'Experimental',
  },
  {
    id: 'aws_lambda',
    name: 'AWS Lambda',
    logoUrl: `${AWS}/logo_lambda.svg`,
    category: 'Performance',
    useCase: 'Debug function errors, timeouts & cold start frequency',
    description:
      'Correlate Lambda errors and cold starts with downstream service impact to optimize serverless function performance.',
    packageName: 'aws',
  },
  {
    id: 'aws_firewall',
    name: 'AWS Network Firewall',
    logoUrl: `${AWS}/logo_firewall.svg`,
    category: 'Security',
    useCase: 'Monitor firewall rules & see what traffic is being blocked',
    description:
      'Review blocked traffic patterns, identify noisy rules, and detect intrusion attempts at your VPC perimeter.',
    packageName: 'aws',
  },
  {
    id: 'aws_route53',
    name: 'AWS Route 53',
    logoUrl: `${AWS}/logo_route53.svg`,
    category: 'Reliability',
    useCase: 'Track DNS query health, latency & resolver errors',
    description:
      'Detect DNS resolution failures and unusual query volumes that signal misconfigurations or DNS-based attacks.',
    packageName: 'aws',
  },
  {
    id: 'aws_securityhub',
    name: 'AWS Security Hub',
    logoUrl: `${AWS}/logo_securityhub.svg`,
    category: 'Security',
    useCase: 'Aggregate security findings from across AWS services',
    description:
      'Consolidate findings from GuardDuty, Inspector, Macie, and more into a single Elastic security workflow.',
    packageName: 'aws',
    badge: 'Technical preview',
  },
  {
    id: 'aws_securityhub_cspm',
    name: 'AWS Security Hub CSPM',
    logoUrl: `${AWS}/logo_securityhub.svg`,
    category: 'Compliance',
    useCase: 'Identify cloud security posture misconfigurations',
    description:
      'Surface publicly exposed resources, weak IAM policies, and unencrypted data stores across your AWS accounts.',
    packageName: 'aws',
    agentless: true,
  },
  {
    id: 'aws_transit_gateway',
    name: 'AWS Transit Gateway',
    logoUrl: `${AWS}/logo_vpcflow.svg`,
    category: 'Infrastructure',
    useCase: 'Monitor inter-VPC traffic flows & bandwidth usage',
    description:
      'Identify bandwidth saturation on transit gateway attachments and trace cross-VPC traffic anomalies.',
    packageName: 'aws',
  },
  {
    id: 'aws_usage',
    name: 'AWS Usage',
    logoUrl: `${AWS}/logo_aws.svg`,
    category: 'Cost',
    useCase: 'Track service quotas to avoid hitting limits',
    description:
      'Monitor service usage against quotas and request limit increases before throttling disrupts your workloads.',
    packageName: 'aws',
  },
  {
    id: 'aws_waf',
    name: 'AWS WAF',
    logoUrl: `${AWS}/logo_waf.svg`,
    category: 'Security',
    useCase: 'Monitor web firewall rules & blocked attack patterns',
    description:
      'Identify which WAF rules are triggering, see attacker IPs, and validate that your rules are blocking real threats.',
    packageName: 'aws',
  },
  {
    id: 'custom_aws_logs',
    name: 'Custom AWS Logs',
    logoUrl: `${AWS}/logo_aws.svg`,
    category: 'Custom',
    useCase: 'Ingest any custom log format from S3 or CloudWatch',
    description:
      'Parse and ship application-specific or third-party logs stored in S3 or streamed through CloudWatch Logs.',
    packageName: 'aws',
  },
];
