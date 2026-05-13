---
title: "Exploring AWS STS AssumeRoot"
subtitle: "AssumeRoot Abuse and Detection Strategies in AWS Organizations"
slug: "exploring-aws-sts-assumeroot"
date: "2024-12-10"
description: "Explore AWS STS AssumeRoot, its risks, detection strategies, and practical scenarios to secure against privilege escalation and account compromise using Elastic's SIEM and CloudTrail data."
author:
  - slug: terrance-dejesus
image: "Security Labs Images 20.jpg"
category:
  - slug: security-research
---

## Preamble

Welcome to another installment of AWS detection engineering with Elastic. This article will dive into the new AWS Security Token Service(STS) API operation, AssumeRoot, simulate some practical behavior in a sandbox AWS environment, and explore detection capabilities within Elastic’s SIEM.

What to expect from this article:

* Basic insight into AWS STS web service  
* Insight into STS’ AssumeRoot API operation  
* Threat scenario using AssumeRoot with Terraform and Python code  
* Detection and hunting opportunities for potential AssumeRoot abuse

## Understanding AWS STS and the AssumeRoot API

AWS Security Token Service (STS) is a web service that enables users, accounts, and roles to request temporary, limited-privilege credentials. For IAM users, their accounts are typically registered in AWS Identity and Access Management (IAM), where either a login profile is attached for accessing the console or access keys, and secrets are created for programmatic use by services like Lambda, EC2, and others.

While IAM credentials are persistent, [**STS credentials**](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp.html#sts-regionalization) are temporary. These credentials \- comprising an access key, secret key, and session token \- are granted upon request and are valid for a specific period. Requests are typically sent to the global `sts.amazonaws.com` endpoint, which responds with temporary credentials for a user or role. These credentials can then be used to access other AWS services on behalf of the specified user or role, as long as the action is explicitly allowed by the associated permission policy.

This process is commonly known as assuming a role, executed via the [`AssumeRole`](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) API. It is frequently used in AWS environments and organizations for various scenarios. For example:

* An EC2 instance with an attached role will automatically use `AssumeRole` to retrieve temporary credentials for API requests.  
* Similarly, Lambda functions often invoke `AssumeRole` to authenticate and perform their designated actions.

Although `AssumeRole` is incredibly useful, it can pose a risk if roles are over-permissioned by the organization. Misconfigured policies with excessive permissions can allow adversaries to abuse these roles, especially in environments where the [Principle of Least Privilege](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_permissions_least_privileges.html) (PoLP) is not strictly enforced. Note that the security risks associated with AssumeRole are typically attributed to misconfigurations or not following best security practices by organizations. These are not the result of AssumeRole or even AssumeRoot development decisions.

### Introduction to AssumeRoot

AWS recently introduced the `AssumeRoot` API operation to STS. Similar to `AssumeRole`, it allows users to retrieve temporary credentials \- but specifically for the [root user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html) of a member account in an AWS organization.

### What Are Member Accounts?

In AWS, [member accounts](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_access.html) are separate accounts within an organization that have their own IAM users, services, and roles. These accounts are distinct from the management account, but they still fall under the same organizational hierarchy. Each AWS organization is created with a unique root account tied to the email address used during its setup. Similarly, every member account requires a root user or email address at the time of its creation, effectively establishing its own root identity.

### How Does AssumeRoot Work?

When a privileged user in the management account needs root-level privileges for a member account, they can use the `AssumeRoot` API to retrieve temporary credentials for the member account's root user. Unlike `AssumeRole`, where the target principal is a user ARN, the target principal for `AssumeRoot` is the member account ID itself. Additionally, a task policy ARN must be specified, which defines the specific permissions allowed with the temporary credentials.

Here are the available task policy ARNs for `AssumeRoot`:

* [IAMAuditRootUserCredentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/security-iam-awsmanpol.html#security-iam-awsmanpol-IAMAuditRootUserCredentials)  
* [IAMCreateRootUserPassword](https://docs.aws.amazon.com/IAM/latest/UserGuide/security-iam-awsmanpol.html#security-iam-awsmanpol-IAMCreateRootUserPassword)  
* [IAMDeleteRootUserCredentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/security-iam-awsmanpol.html#security-iam-awsmanpol-IAMDeleteRootUserCredentials)  
* [S3UnlockBucketPolicy](https://docs.aws.amazon.com/IAM/latest/UserGuide/security-iam-awsmanpol.html#security-iam-awsmanpol-S3UnlockBucketPolicy)  
* [SQSUnlockQueuePolicy](https://docs.aws.amazon.com/IAM/latest/UserGuide/security-iam-awsmanpol.html#security-iam-awsmanpol-SQSUnlockQueuePolicy)

### Potential Abuse of Task Policies

While these predefined task policies limit what can be done with `AssumeRoot`, their scope can still be theoretically abused in the right circumstances. For example:

* **IAMCreateRootUserPassword**: This policy grants the [`iam:CreateLoginProfile`](https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateLoginProfile.html) permission, allowing the creation of a login profile for a user that typically doesn't require console access. If an adversary gains access to programmatic credentials, they could create a login profile and gain console access to the account that is more persistent.  
* **IAMDeleteRootUserCredentials**: This policy allows the deletion of root credentials, but also grants permissions like [`iam:ListAccessKeys`](https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListAccessKeys.html) and [`iam:ListMFADevices`](https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListMFADevices.html). These permissions could help an adversary gather critical information about access credentials or MFA configurations for further exploitation.

## AssumeRoot in Action

Now that we understand how AssumeRoot works at a high level, how it differs from AssumeRole, and the potential risks associated with improper security practices, let’s walk through a practical scenario to simulate its usage. It should be noted that this is one of many potential scenarios where AssumeRoot may or could be abused. As of this article's publication, no active abuse has been reported in the wild, as expected with a newer AWS functionality.

Below is a simple depiction of what we will accomplish in the following sections:

![AssumeRoot scenario workflow](/assets/images/exploring-aws-sts-assumeroot/image3.png)

Before diving in, it’s important to highlight that we’re using an admin-level IAM user configured as the default profile for our local AWS CLI. This setup enables us to properly configure the environment using [Terraform](https://developer.hashicorp.com/terraform) and simulate potential threat scenarios in AWS for detection purposes.

### Member Account Creation

The first step is to enable centralized root access for member accounts, as outlined in the [AWS documentation](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts.html). Centralized root access allows us to group all AWS accounts into a single organization, with each member account having its own root user.

Next, we manually create a member account within our organization through the Accounts section in the AWS Management Console. For this scenario, the key requirement is to note the member account ID, a unique 12-digit number. For our example, we’ll assume this ID is `000000000001` and name it *AWSAssumeRoot*. Centralized management of AWS accounts is a common practice for organizations that may separate different operational services into separate AWS accounts but want to maintain centralized management.

![AWS console showing management account and member account *AWSAssumeRoot*](/assets/images/exploring-aws-sts-assumeroot/image4.png)

We also add the member account as the [delegated administrator](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_delegate_policies.html) for centralized root access as well, which allows that root member account to have centralized root access for any other member accounts of the organization.

While we won’t cover it in depth, we have also enabled the new [Resource control policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps.html) (RCPs) within Identity and Access Management (IAM), which will allow central administration over permissions granted to resources within accounts in our organization, but by default, the *RCPFullAWSAccess* policy allows all permissions to all services for all principals and is attached directly to root.

### Environment Setup

For our simulation, we use Terraform to create an overly permissive IAM user named compromised\_user. This user is granted the predefined [AdministratorAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AdministratorAccess.html) policy, which provides admin-level privileges. Additionally, we generated an access key for this user while intentionally omitting a login profile to reflect a typical setup where credentials are used programmatically. This is not an uncommon practice, especially in developer environments.

Below is the `main.tf` configuration used to create the resources:

```
provider "aws" {
  region = var.region
}

data "aws_region" "current" {}

# Create an IAM user with AdministratorAccess (simulated compromised user)
resource "aws_iam_user" "compromised_user" {
  name = "CompromisedUser"
}

# Attach AdministratorAccess Policy to the compromised user
resource "aws_iam_user_policy_attachment" "compromised_user_policy" {
  user       = aws_iam_user.compromised_user.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Create access keys for the compromised user
resource "aws_iam_access_key" "compromised_user_key" {
  user = aws_iam_user.compromised_user.name
}
```

We also define an `outputs.tf` file to capture key details about the environment, such as the region, access credentials, and the user ARN:

```
output "aws_region" {
  description = "AWS Region where the resources are deployed"
  value       = var.region
}

output "compromised_user_access_key" {
  value       = aws_iam_access_key.compromised_user_key.id
  sensitive   = true
  description = "Access key for the compromised IAM user"
}

output "compromised_user_secret_key" {
  value       = aws_iam_access_key.compromised_user_key.secret
  sensitive   = true
  description = "Secret key for the compromised IAM user"
}

output "compromised_user_name" {
  value       = aws_iam_user.compromised_user.name
  description = "Name of the compromised IAM user"
}

output "compromised_user_arn" {
  value       = aws_iam_user.compromised_user.arn
  description = "ARN of the compromised IAM user"
}
```

Once we run `terraform apply`, the configuration creates a highly permissive IAM user (`compromised_user`) with associated credentials. These credentials simulate those that an adversary might obtain for initial access or escalating privileges.

This is one of the first hurdles for an adversary, collecting valid credentials. In today’s threat landscape information stealer malware and phishing campaigns are more common than ever, aimed at obtaining credentials that can be sold or used for lateral movement. While this is a hurdle, the probability of compromised credentials for initial access is high \- such as those with [SCATTERED SPIDER](https://www.cisa.gov/sites/default/files/2023-11/aa23-320a_scattered_spider_0.pdf) and [SCARLETEEL](https://sysdig.com/blog/scarleteel-2-0/).

![](/assets/images/exploring-aws-sts-assumeroot/image1.png)

### Establish an STS Client Session with Stolen Credentials

The next step is to establish an STS client session using the compromised credentials (`compromised_user` access key and secret key). This session allows the adversary to make requests to AWS STS on behalf of the compromised user.

Here’s the Python code to establish the STS client using the [AWS Boto3 SDK](https://aws.amazon.com/sdk-for-python/) (the AWS SDK used to create, configure, and manage AWS services, such as Amazon EC2 and Amazon S3). This Python code is used to create the STS client with stolen IAM user credentials:

```
 sts_client = boto3.client(
     "sts",
     aws_access_key_id=compromised_access_key,
     aws_secret_access_key=compromised_secret_key,
     region_name=region,
     endpoint_url=f'https://sts.{region}.amazonaws.com'
 )
 ```

![Terminal output when creating STS client with stolen IAM user credentials](/assets/images/exploring-aws-sts-assumeroot/image7.png)

**Note:** During testing, we discovered that the `endpoint_url` must explicitly point to `https://sts.<region>.amazonaws.com`. Omitting this may result in an `InvalidOperation` error when attempting to invoke the `AssumeRoot` API.

This STS client session forms the foundation for simulating an adversary's actions as we have taken compromised credentials and initiated our malicious actions.

### Assume Root for Member Account on Behalf of Compromised User

After establishing an STS client session as the compromised user, we can proceed to call the AssumeRoot API. This request allows us to assume the root identity of a member account within an AWS Organization. For the request, the TargetPrincipal is set to the member account ID we obtained earlier, the session duration is set to 900 seconds (15 minutes), and the TaskPolicyArn is defined as `IAMCreateRootUserPassword`. This policy scopes the permissions to actions related to creating or managing root login credentials.

A notable permission included in this policy is [`CreateLoginProfile`](https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateLoginProfile.html), which enables the creation of a login password for the root user. This allows access to the AWS Management Console as the root user.

Below is the Python code to assume root of member account `000000000001`, with permissions scoped by *IAMCreateRootUserPassword*.

```
response = sts_client.assume_root(
    TargetPrincipal=member_account_id,
    DurationSeconds=900,
    TaskPolicyArn={"arn": "arn:aws:iam::aws:policy/root-task/IAMCreateRootUserPassword"},
)
root_temp_creds = response["Credentials"]
```

If the AssumeRoot request is successful, the response provides temporary credentials (`root_temp_creds`) for the root account of the target member. These credentials include an access key, secret key, and session token, enabling temporary root-level access for the duration of the session.

![Terminal output showing AssumeRoot with IAMCreateRootUserPassword for AWSAssumeRoot member account
](/assets/images/exploring-aws-sts-assumeroot/image6.png) 

### Creating a Login Profile for the Member Root Account

With temporary root credentials in hand, the next step is to establish an authenticated IAM client session as the root user of the member account. Using this session, we can call the `create_login_profile()` method. This method allows us to assign a login password to the root user, enabling console access.

The following Python code establishes an authenticated IAM client and creates a login profile:

```
iam_client = boto3.client(
    "iam",
    aws_access_key_id=root_temp_creds["AccessKeyId"],
    aws_secret_access_key=root_temp_creds["SecretAccessKey"],
    aws_session_token=root_temp_creds["SessionToken"],
)

response = iam_client.create_login_profile()
```

It’s worth noting that the `create_login_profile()` method requires no explicit parameters for the root user, as it acts on the credentials of the currently authenticated session. In this case, it will apply to the root user of the member account.

![Terminal output showing IAM client established as Root member account and CreateLoginProfile request](/assets/images/exploring-aws-sts-assumeroot/image5.png) 


### Reset the Administrator Password and Login to the AWS Console

At this stage, we’re nearly complete\! Let’s recap the progress so far:

1. Using compromised IAM user credentials, we established an STS session to assume the identity of an overly permissive user.  
2. Leveraging this session, we assumed the identity of the root user of a target member account, acquiring temporary credentials scoped to the `IAMCreateRootUserPassword` task policy.  
3. With these temporary root credentials, we established an IAM client session and successfully created a login profile for the root user.

The final step involves resetting the root user password to gain permanent access to the AWS Management Console. To do this, visit the AWS console login page and attempt to log in as the root user. Select the “Forgot Password” option to initiate the password recovery process. This will prompt a CAPTCHA challenge, after which a password reset link is sent to the root user’s email address. This would be the third roadblock for an adversary as they would need access to the root user’s email inbox to continue with the password reset workflow. It should be acknowledged that if *CreateLoginProfile* is called, you can specify the password for the user and enforce a “password reset required”. However, this is not allowed for root accounts by default, and for good reason by AWS. Unlike the first hurdle of having valid credentials, access to a user’s inbox may prove more difficult and less likely, but again, with enough motivation and resources, it is still possible.

![Password recovery request from AWS sign-in for root](/assets/images/exploring-aws-sts-assumeroot/image2.png)

After selecting the password reset link, you can set a new password for the root user. This step provides lasting access to the console as the root user. Unlike the temporary credentials obtained earlier, this access is no longer limited by the session duration or scoped permissions of the IAMCreateRootUserPassword policy, granting unrestricted administrative control over the member account.

![Successful login as root for AWSAssumeRoot member account](/assets/images/exploring-aws-sts-assumeroot/image8.png)

**Before moving on, if you followed along and tried this in your environment, we want to gently remind you to use Terraform to remove testing resources** using the terraform destroy command in the same folder where you initialized and deployed the resources.

## Detection and Hunting Opportunities

While exploring cloud features and APIs from an adversary's perspective is insightful, our ultimate responsibility lies in detecting and mitigating malicious or anomalous behavior, alerting stakeholders, and responding effectively. Also, while such a scenario has not been publicly documented in the wild, we should not wait to be a victim either and be reactive, hence the reason for our whitebox scenario.

The following detection and hunting queries rely on AWS CloudTrail data ingested into the Elastic Stack using the [AWS integration](https://www.elastic.co/docs/current/integrations/aws). If your environment differs, you may need to adjust these queries for custom ingestion processes or adapt them for a different SIEM or query tool.

**Note:** Ensure that AWS CloudTrail is enabled for all accounts in your organization to provide comprehensive visibility into activity across your AWS environment. You may also need to enable the specific trail used for monitoring across the entire organization so all member accounts are observed properly.

### Hunting \- Unusual Action for IAM User Access Key

This query identifies potentially compromised IAM access keys that are used to make unusual API calls. It sorts the results in ascending order to surface less frequent API calls within the last two weeks. This query can be adjusted to account for different API calls or include other CloudTrail-specific fields.

Hunting Query: [AWS IAM Unusual AWS Access Key Usage for User](https://github.com/elastic/detection-rules/blob/7b88b36d294407cc1ea2ab1b0acbbbf3104162a9/hunting/aws/docs/iam_unusual_access_key_usage_for_user.md)

MITRE ATT\&CK: 

* T1078.004 \- [Valid Accounts: Cloud Accounts](https://attack.mitre.org/techniques/T1078/004/)

Language: ES|QL

```
FROM logs-aws.cloudtrail*
| WHERE @timestamp > now() - 14 day
| WHERE
    event.dataset == "aws.cloudtrail"
    and event.outcome == "success"
    and aws.cloudtrail.user_identity.access_key_id IS NOT NULL
    and aws.cloudtrail.resources.arn IS NOT NULL
    and event.action NOT IN ("GetObject")
| EVAL daily_buckets = DATE_TRUNC(1 days, @timestamp)
| STATS
    api_counts = count(*) by daily_buckets, aws.cloudtrail.user_identity.arn, aws.cloudtrail.user_identity.access_key_id, aws.cloudtrail.resources.arn, event.action
| WHERE api_counts < 2
| SORT api_counts ASC
```

### Detection \- Unusual Assume Root Action by Rare IAM User

Detection Rule: [AWS STS AssumeRoot by Rare User and Member Account](https://github.com/elastic/detection-rules/blob/main/rules/integrations/aws/privilege_escalation_sts_assume_root_from_rare_user_and_member_account.toml)

This query identifies instances where the `AssumeRoot` API call is made by an IAM user ARN and member account that have not performed this action in the last 14 days. This anomaly-based detection uses Elastic’s [New Terms](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-new-terms-rule) detection rule.

* The `aws.cloudtrail.user_identity.arn` field identifies the source IAM user from the management AWS account.  
* The `aws.cloudtrail.resources.account_id` field reflects the target member account.

MITRE ATT\&CK: 

* T1548.005 \- [Temporary Elevated Cloud Access](https://attack.mitre.org/techniques/T1548/005/)  
* T1098.003 \- [Additional Cloud Roles](https://attack.mitre.org/techniques/T1098/003/)

Language: KQL

```
event.dataset: "aws.cloudtrail"
    and event.provider: "sts.amazonaws.com"
    and event.action: "AssumeRoot"
    and event.outcome: "success"
```

New Term Fields:  
If any combination of these fields has not been seen executing AssumeRoot within the last 14 days, an alert is generated.

* `aws.cloudtrail.user_identity.arn`  
* `aws.cloudtrail.resources.account_id`

### Detection \- Self-Created Login Profile for Root Member Account

This query detects instances where a login profile is created for a root member account by the root account itself, potentially indicating unauthorized or anomalous behavior.

Detection Rule: [AWS IAM Login Profile Added for Root](https://github.com/elastic/detection-rules/blob/4374128458d116211d5d22993b6d87f6c82a30a0/rules/integrations/aws/persistence_iam_create_login_profile_for_root.toml)

MITRE ATT\&CK:

* T1098.003 \- [Account Manipulation: Additional Cloud Roles](https://attack.mitre.org/techniques/T1098/003/)  
* T1548.005 \- [Abuse Elevation Control Mechanism: Temporary Elevated Cloud Access](https://attack.mitre.org/techniques/T1548/005/)  
* T1078.004 \- [Valid Accounts: Cloud Accounts](https://attack.mitre.org/techniques/T1078/004/)

Language: ES|QL

```
FROM logs-aws.cloudtrail* 
| WHERE
    // filter for CloudTrail logs from IAM
    event.dataset == "aws.cloudtrail"
    and event.provider == "iam.amazonaws.com"
    // filter for successful CreateLoginProfile API call
    and event.action == "CreateLoginProfile"
    and event.outcome == "success"
    // filter for Root member account
    and aws.cloudtrail.user_identity.type == "Root"
    // filter for an access key existing which sources from AssumeRoot
    and aws.cloudtrail.user_identity.access_key_id IS NOT NULL
    // filter on the request parameters not including UserName which assumes self-assignment
    and NOT TO_LOWER(aws.cloudtrail.request_parameters) LIKE "*username*"
| keep
    @timestamp,
    aws.cloudtrail.request_parameters,
    aws.cloudtrail.response_elements,
    aws.cloudtrail.user_identity.type,
    aws.cloudtrail.user_identity.arn,
    aws.cloudtrail.user_identity.access_key_id,
    cloud.account.id,
    event.action,
    source.address
    source.geo.continent_name,
    source.geo.region_name,
    source.geo.city_name,
    user_agent.original,
    user.id
```

These detections are specific to our scenario, however, are not fully inclusive regarding all potential AssumeRoot abuse. If you choose to explore and discover some additional hunting or threat detection opportunities, feel free to share in our [Detection Rules](https://github.com/elastic/detection-rules) repository or the [Threat Hunting](https://github.com/elastic/detection-rules/tree/main/hunting) library of ours.

## Hardening Practices for AssumeRoot Use

AWS [documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) contains several important considerations for best security practices regarding IAM, STS, and many other services. However, cloud security is not a “one size fits all” workflow and security practices should be tailored to your environment, risk-tolerance, and more.

**Visibility is Key:** If you can’t see it, you can’t protect it. Start by enabling CloudTrail with organization-wide trails to log activity across all accounts. Focus on capturing IAM and STS operations for insights into access and permission usage. Pair this with Security Hub for continuous monitoring and tools like Elastic or GuardDuty to hunt for unusual AssumeRoot actions.

**Lock Down AssumeRoot Permissions:** Scope AssumeRoot usage to critical tasks only, like audits or recovery, by restricting task policies to essentials like IAMAuditRootUserCredentials. Assign these permissions to specific roles in the management account and keep those roles tightly controlled. Regularly review and remove unnecessary permissions to maintain the PLoP.

**MFA and Guardrails for Root Access:** Enforce MFA for all users, especially those with access to AssumeRoot. Use AWS Organizations to disable root credential recovery unless absolutely needed and remove unused root credentials entirely. RCPs can help centralize and tighten permissions for tasks involving AssumeRoot or other sensitive operations.

# Conclusion

We hope this article provides valuable insight into AWS’ AssumeRoot API operation, how it can be abused by adversaries, and some threat detection and hunting guidance. Abusing AssumeRoot is one of many living-off-the-cloud (LotC) techniques that adversaries have the capability to target, but we encourage others to explore, research, and share their findings accordingly with the community and AWS.
