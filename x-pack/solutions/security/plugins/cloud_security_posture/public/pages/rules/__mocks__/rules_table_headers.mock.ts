/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const selectRulesMock = [
  {
    metadata: {
      impact:
        'Audit logs will be created on the master nodes, which will consume disk space. Care should be taken to avoid generating too large volumes of log information as this could impact the available of the cluster nodes.\nS3 lifecycle features can be used to manage the accumulation and management of logs over time. \n\nSee the following AWS resource for more information on these features:\nhttp://docs.aws.amazon.com/AmazonS3/latest/dev/object-lifecycle-mgmt.html',
      default_value:
        "By default, cluster control plane logs aren't sent to CloudWatch Logs. ... When you enable a log type, the logs are sent with a log verbosity level of 2 .  To enable or disable control plane logs with the console. Open the Amazon EKS console at https://console.aws.amazon.com/eks/home#/clusters . Amazon EKS Information in CloudTrail CloudTrail is enabled on your AWS account when you create the account. When activity occurs in Amazon EKS, that activity is recorded in a CloudTrail event along with other AWS service events in Event history.\n",
      references:
        '1. https://kubernetes.io/docs/tasks/debug-application-cluster/audit/\n2. https://aws.github.io/aws-eks-best-practices/detective/\n3. https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html\n4. https://docs.aws.amazon.com/eks/latest/userguide/logging-using-cloudtrail.html',
      id: '66cd0518-cfa3-5917-a399-a7dfde4e19db',
      name: 'Enable audit Logs',
      profile_applicability: '* Level 1',
      description:
        'The audit logs are part of the EKS managed Kubernetes control plane logs that are managed by Amazon EKS.\nAmazon EKS is integrated with AWS CloudTrail, a service that provides a record of actions taken by a user, role, or an AWS service in Amazon EKS.\nCloudTrail captures all API calls for Amazon EKS as events.\nThe calls captured include calls from the Amazon EKS console and code calls to the Amazon EKS API operations.',
      rationale:
        'Exporting logs and metrics to a dedicated, persistent datastore such as CloudTrail ensures availability of audit data following a cluster security event, and provides a central location for analysis of log and metric data collated from multiple sources.',
      audit:
        'Perform the following to determine if CloudTrail is enabled for all regions:\n\n**Via the Management Console**\n\n1. Sign in to the AWS Management Console and open the EKS console at https://console.aws.amazon.com/eks\n2. Click on Cluster Name of the cluster you are auditing\n3. Click Logging\n You will see Control Plane Logging info\n\n ```\n API Server Audit Authenticator\n Enabled/Disabled Enabled/Disabled Enabled/Disabled\n\n Controller Manager Scheduler\n Enabled/Disabled Enabled/Disabled\n```\n4. Ensure all 5 choices are set to Enabled',
      remediation:
        'Perform the following to determine if CloudTrail is enabled for all regions:\n\n**Via The Management Console**\n\n1. Sign in to the AWS Management Console and open the EKS console at https://console.aws.amazon.com/eks\n2. Click on Cluster Name of the cluster you are auditing\n3. Click Logging\n4. Select Manage Logging from the button on the right hand side\n5. Toggle each selection to the Enabled position.\n6. Click Save Changes\n\n**Via CLI**\n\n`aws --region "${REGION_CODE}" eks describe-cluster --name "${CLUSTER_NAME}" --query \'cluster.logging.clusterLogging[?enabled==true].types`',
      section: 'Logging',
      version: '1.0',
      tags: ['CIS', 'EKS', 'CIS 2.1.1', 'Logging'],
      benchmark: {
        name: 'CIS Amazon Elastic Kubernetes Service (EKS)',
        version: 'v1.0.1',
        id: 'cis_eks',
        rule_number: '2.1.1',
        posture_type: 'kspm',
      },
      rego_rule_id: 'cis_2_1_1',
    },
    state: 'unmuted',
  },
  {
    metadata: {
      impact: 'None.',
      default_value: 'See the AWS EKS documentation for the default value.\n',
      references: '1. https://kubernetes.io/docs/admin/kube-proxy/',
      id: '90b8ae5e-df30-5ba6-9fe9-03aab2b7a1c3',
      name: 'Ensure that the kubeconfig file permissions are set to 644 or more restrictive',
      profile_applicability: '* Level 1',
      description:
        'If `kubelet` is running, and if it is using a file-based kubeconfig file, ensure that the proxy kubeconfig file has permissions of `644` or more restrictive.',
      rationale:
        'The `kubelet` kubeconfig file controls various parameters of the `kubelet` service in the worker node.\nYou should restrict its file permissions to maintain the integrity of the file.\nThe file should be writable by only the administrators on the system.\n\nIt is possible to run `kubelet` with the kubeconfig parameters configured as a Kubernetes ConfigMap instead of a file.\nIn this case, there is no proxy kubeconfig file.',
      audit:
        "SSH to the worker nodes\n\nTo check to see if the Kubelet Service is running:\n```\nsudo systemctl status kubelet\n```\nThe output should return `Active: active (running) since..`\n\nRun the following command on each node to find the appropriate kubeconfig file:\n\n```\nps -ef | grep kubelet\n```\nThe output of the above command should return something similar to `--kubeconfig /var/lib/kubelet/kubeconfig` which is the location of the kubeconfig file.\n\nRun this command to obtain the kubeconfig file permissions:\n\n```\nstat -c %a /var/lib/kubelet/kubeconfig\n```\nThe output of the above command gives you the kubeconfig file's permissions.\n\nVerify that if a file is specified and it exists, the permissions are `644` or more restrictive.",
      remediation:
        'Run the below command (based on the file location on your system) on the each worker\nnode.\nFor example,\n```\nchmod 644 <kubeconfig file>\n```',
      section: 'Worker Node Configuration Files',
      version: '1.0',
      tags: ['CIS', 'EKS', 'CIS 3.1.1', 'Worker Node Configuration Files'],
      benchmark: {
        name: 'CIS Amazon Elastic Kubernetes Service (EKS)',
        version: 'v1.0.1',
        id: 'cis_eks',
        rule_number: '3.1.1',
        posture_type: 'kspm',
      },
      rego_rule_id: 'cis_3_1_1',
    },
    state: 'unmuted',
  },
];
