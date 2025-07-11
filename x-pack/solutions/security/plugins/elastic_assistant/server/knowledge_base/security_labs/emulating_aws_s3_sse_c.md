---
title: "Emulating AWS S3 SSE-C Ransom for Threat Detection"
slug: "emulating-aws-s3-sse-c"
date: "2025-02-20"
subtitle: "Understanding and Detecting Ransom Using AWS S3’ SSE-C Service"
description: "In this article, we’ll explore how threat actors leverage Amazon S3’s Server-Side Encryption with Customer-Provided Keys (SSE-C) for ransom/extortion operations."
author:
  - slug: terrance-dejesus
image: "Security Labs Images 11.jpg"
category:
  - slug: security-research
---

# Preamble

Welcome to another installment of AWS detection engineering with Elastic. You can read the previous installment on [STS AssumeRoot here](https://www.elastic.co/security-labs/exploring-aws-sts-assumeroot). 

In this article, we’ll explore how threat actors leverage Amazon S3’s Server-Side Encryption with Customer-Provided Keys (SSE-C) for ransom/extortion operations. This contemporary abuse tactic demonstrates the creative ways adversaries can exploit native cloud services to achieve their monetary goals.

As a reader, you’ll gain insights into the inner workings of S3, SSE-C workflows, and bucket configurations. We’ll also walk through the steps of this technique, discuss best practices for securing S3 buckets, and provide actionable guidance for crafting detection logic to identify SSE-C abuse in your environment.

This research builds on a recent [publication](https://www.halcyon.ai/blog/abusing-aws-native-services-ransomware-encrypting-s3-buckets-with-sse-c) by the Halcyon Research Team, which documented the first publicly known case of in-the-wild (ItW) abuse of SSE-C for ransomware behavior. Join us as we dive deeper into this emerging threat and demonstrate how to stay ahead of adversaries. 

We have published a [gist](https://gist.github.com/terrancedejesus/f703a4a37a70d005080950a418422ac9) containing the Terraform code and emulation script referenced in this blog. This content is provided for educational and research purposes only. Please use it responsibly and in accordance with applicable laws and guidelines. Elastic assumes no liability for any unintended consequences or misuse.

Do enjoy!

# Understanding AWS S3: Key Security Concepts and Features

Before we dive directly into emulation and these tactics, techniques, and procedures (TTPs), let’s briefly review what AWS S3 includes.

S3 is AWS’ common storage service that allows users to store any unstructured or structured data in “buckets”. These buckets are similar to folders that one would find locally on their computer system. The data stored in these buckets are called [objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingObjects.html), and each object is uniquely identified by an object key, which functions like a filename. S3 supports many data formats, from JSON to media files and much more, making it ideal for a variety of organizational use cases.

[Buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket.html) can be [set up](https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-buckets-s3.html) to store objects from various AWS S3 services, but they can also be populated manually or programmatically depending on the use case. Additionally, buckets can leverage versioning to maintain multiple versions of objects, which provides resilience against accidental deletions or overwrites. However, versioning is not always enabled by default, leaving data vulnerable to certain types of attacks, such as those involving ransomware or bulk deletions.
[Buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket.html) can be [set up](https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-buckets-s3.html) to store objects from various AWS S3 services, but they can also be populated manually or programmatically depending on the use case. Additionally, buckets can leverage versioning to maintain multiple versions of objects, which provides resilience against accidental deletions or overwrites. However, versioning is not always enabled by default, leaving data vulnerable to certain types of attacks, such as those involving ransomware or bulk deletions.

Access to these buckets depends heavily on their access policies, typically defined during creation. These policies include settings such as disabling public access to prevent unintended exposure of bucket contents. Configuration doesn’t stop there, though; buckets also have their own unique Amazon Resource Name (ARN), which allows further granular access policies to be defined via identity access management (IAM) roles or policies. For example, if user “Alice” needs access to a bucket and its objects, specific permissions such as `s3:GetObject`, must be assigned to their IAM role. That role can either be applied directly to Alice as a permission policy or to an associated group they belong to.

While these mechanisms seem foolproof, misconfigurations in access controls (e.g., overly permissive bucket policies or access control lists) are a common cause of security incidents. For example, as of this writing, approximately 325.8k buckets are publicly available according to [buckets.grayhatwarfare.com](http://buckets.grayhatwarfare.com). Elastic Security Labs also observed that 30% of failed AWS posture checks were connected to S3 in the [2024 Elastic Global Threat Report](https://www.elastic.co/resources/security/report/global-threat-report). 

**Server-Side Encryption in S3**  
S3 provides [multiple encryption options](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html) for securing data at rest. These include:

* [SSE-S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html): Encryption keys are fully managed by AWS.  
* [SSE-KMS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html): Keys are managed through AWS Key Management Service (KMS), allowing for more custom key policies and access control — see how these are [implemented in Elastic](https://www.elastic.co/blog/encryption-at-rest-elastic-cloud-aws-kms).  
* [SSE-C](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html): Customers provide their own encryption keys for added control. This option is often used for compliance or specific security requirements but introduces additional operational overhead, such as securely managing and storing keys. Importantly, AWS does not store SSE-C keys; instead, a key’s HMAC (hash-based message authentication code) is logged for verification purposes.

In the case of SSE-C, mismanagement of encryption keys or intentional abuse (e.g., ransomware) can render data permanently inaccessible.

**Lifecycle Policies**

S3 buckets can also utilize [lifecycle policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html), which automate actions such as transitioning objects to cheaper storage classes (e.g., Glacier) or deleting objects after a specified time. While these policies are typically used for cost optimization, they can be exploited by attackers to schedule the deletion of critical data, increasing pressure during a ransom incident.

**Storage Classes**

Amazon S3 provides multiple [storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html), each designed for different access patterns and frequency needs. While storage classes are typically chosen for cost optimization, understanding them is crucial when considering how encryption and security interact with data storage.

For example, S3 Standard and Intelligent-Tiering ensure frequent access with minimal latency, making them suitable for live applications. On the other hand, archival classes like Glacier Flexible Retrieval and Deep Archive introduce delays before data can be accessed, which can complicate incident response in security scenarios.

This becomes particularly relevant when encryption is introduced. Server-Side Encryption (SSE) works across all storage classes, but SSE-C (Customer-Provided Keys) shifts the responsibility of key management to the user or adversary. Unlike AWS-managed encryption (SSE-S3, SSE-KMS), SSE-C requires that every retrieval operation supplies the original encryption key — and if that key is lost or not given by an adversary, the data is permanently unrecoverable.

With this understanding, a critical question arises about the implications of SSE-C abuse observed in the wild: What happens when an attacker gains access to publicly exposed or misconfigured S3 buckets and has control over both the storage policy and encryption keys?

# Thus Begins: SSE-C Abuse for Ransom Operations

In the following section, we will share a hands-on approach to emulating this behavior in our sandbox AWS environment by completing the following:

1. Deploy vulnerable infrastructure via Infrastructure-as-Code (IaC) provider Terraform  
2. Explore how to craft SSE-C requests in Python  
3. Detonate a custom script to emulate the ransom behavior described in the Halcyon blog

## Pre-requisites

This article is about recreating a specific scenario for detection engineering. If this is your goal, the following needs to be established first.

* [Terraform](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli) must be installed locally  
* Python 3.9+ must also be installed locally to be used for the virtual environment and to run an emulation script  
* [AWS CLI](https://aws.amazon.com/cli/) profile must be set up with administrative privileges to be used by Terraform during infrastructure deployment

# Deploying Vulnerable Infrastructure

For our whitebox emulation, it is important to replicate an S3 configuration that an organization might have in a real-world scenario. Below is a summary of the infrastructure deployed:

* **Region**: us-east-1 (default deployment region)  
* **S3 Bucket**: A uniquely named payroll data bucket that contains sensitive data and allows adversary-controlled encryption  
* **Bucket Ownership Controls**: Enforces "BucketOwnerEnforced" to prevent ACL-based permissions  
* **Public Access Restrictions**: Public access is fully blocked to prevent accidental exposure  
* **IAM User**: A compromised adversary-controlled IAM user with excessive S3 permissions;no login profile is assigned, as access key credentials are used programmatically elsewhere for automated tasks  
* **IAM Policy**: At both bucket and object levels, adversaries have authorization to:  
  * `s3:GetObject`  
  * `s3:PutObject`  
  * `s3:DeleteObject`  
  * `s3:PutLifecycleConfiguration`  
  * `s3:ListObjects`  
  * `s3:ListBucket`  
* Applied at both bucket and object levels  
* **IAM Access Keys**: Access keys are generated for the adversary user, allowing programmatic access  
* **Dummy Data**: Simulated sensitive data (`customer_data.csv`) is uploaded to the bucket

Understanding the infrastructure is critical for assessing how this type of attack unfolds. The Halcyon blog describes the attack methodology but provides little detail on the specific AWS configuration of the affected organizations. These details are essential for determining the feasibility of such an attack and the steps required for successful execution.

## Bucket Accessibility and Exposure

For an attack of this nature to occur, an adversary must gain access to an S3 bucket through one of two primary methods:

**Publicly Accessible Buckets**: If a bucket is misconfigured with a public access policy, an adversary can directly interact with it, provided the bucket’s permission policy allows actions such as *`s3:PutObject`*, `s3:DeleteObject`, or `s3:PutLifecycleConfiguration`. These permissions are often mistakenly assigned using a wildcard (\*) principal, meaning anyone can execute these operations.

**Compromised Credentials**: If an attacker obtains AWS credentials (via credential leaks, phishing, or malware), they can authenticate as a legitimate IAM user and interact with S3 as if they were the intended account owner.

In our emulation, we assume the bucket is not public, meaning the attack relies on compromised credentials. This requires the adversary to have obtained valid AWS access keys and to have performed cloud infrastructure discovery to identify accessible S3 buckets. This is commonly done using AWS API calls, such as `s3:ListAllMyBuckets`, `s3:ListBuckets`, or `s3:ListObjects`, which reveal buckets and their contents in specific regions.

**Required IAM Permissions for Attack Execution:** To encrypt files using SSE-C and enforce a deletion policy successfully, the adversary must have appropriate IAM permissions. In our emulation, we configured explicit permissions for the compromised IAM user, but in a real-world scenario, multiple permission models could allow this attack:

* **Custom Overly-Permissive Policies**: Organizations may unknowingly grant broad S3 permissions without strict constraints.  
* **AWS-Managed Policies:** The adversary may have obtained credentials associated with a user or role that has `AmazonS3FullAccess` or `AdministratorAccess`.  
* **Partial Object-Level Permissions**: If the IAM user had *`AllObjectActions`*, this would only allow object-level actions but would not grant lifecycle policy modifications or bucket listing, which are necessary to retrieve objects and then iterate them to encrypt and overwrite.

The Halcyon blog does not specify which permissions were abused, but our whitebox emulation ensures that the minimum necessary permissions are in place for the attack to function as described.

**The Role of the Compromised IAM User**  
Another critical factor is the type of IAM user whose credentials were compromised. In AWS, an adversary does not necessarily need credentials for a user that has an interactive login profile. Many IAM users are created exclusively for programmatic access and do not require an AWS Management Console password or Multi-Factor Authentication (MFA), both of which could serve as additional security blockers.

This means that if the stolen credentials belonging to an IAM user are used for automation or service integration, the attacker would have an easier time executing API requests without additional authentication challenges.

While the Halcyon blog effectively documents the technique used in this attack, it does not include details about the victim's underlying AWS configuration. Understanding the infrastructure behind the attacks — such as bucket access, IAM permissions, and user roles — is essential to assessing how these ransom operations unfold in practice. Since these details are not provided, we must make informed assumptions to better understand the conditions that allowed the attack to succeed.

Our emulation is designed to replicate the minimum necessary conditions for this type of attack, ensuring a realistic assessment of defensive strategies and threat detection capabilities. By exploring the technical aspects of the infrastructure, we can provide deeper insights into potential mitigations and how organizations can proactively defend against similar threats.

## Setting Up Infrastructure

For our infrastructure deployment, we utilize Terraform as our IaC framework. To keep this publication streamlined, we have stored both the Terraform configuration and the atomic emulation script in a downloadable [gist](https://gist.github.com/terrancedejesus/f703a4a37a70d005080950a418422ac9) for easy access. Below is the expected local file structure once these files are downloaded.

![Necessary folder structure when downloading gist](/assets/images/emulating-aws-s3-sse-c/image2.png)

After setting up the required files locally, you can create a Python virtual environment for this scenario and install the necessary dependencies. Once the environment is configured, the following command will initialize Terraform and deploy the infrastructure:

Command: `python3 s3\_sse\_c\_ransom.py deploy`

![Expected console output after terraform initialized and deployed](/assets/images/emulating-aws-s3-sse-c/image7.png)

Once deployment is complete, the required AWS infrastructure will be in place to proceed with the emulation and execution of the attack. It’s important to note that public access is blocked, and the IAM policy is only applied to the dynamically generated IAM user for security reasons. However, we strongly recommend tearing down the infrastructure once testing is complete or after capturing the necessary data.

If you happen to log in to your AWS console or use the CLI, you can verify that the bucket in the `us-east-1` region exists and contains `customer_data.csv,` which, when downloaded, will be in plaintext. You will also note that no “ransom.note” exists either.

![Example of infrastructure deployed with unencrypted customer data in our S3 bucket](/assets/images/emulating-aws-s3-sse-c/image6.png)

![Another example of infrastructure deployed with no ransom.txt file yet](/assets/images/emulating-aws-s3-sse-c/image4.png)

## Explore How to Craft S3 SSE-C Requests in Python

Before executing the atomic emulation, it is important to explore the underlying tradecraft that enables an adversary to successfully carry out this attack ItW.

For those familiar with AWS, S3 operations — such as accessing buckets, listing objects, or encrypting data — are typically straightforward when using the AWS SDKs or AWS CLI. These tools abstract much of the complexity, allowing users to execute operations without needing a deep understanding of the underlying API mechanics. This also lowers the knowledge barrier for an adversary attempting to abuse these functionalities.

However, the Halcyon blog notes a critical technical detail about the attack execution:

“*The attacker initiates the encryption process by calling the x-amz-server-side-encryption-customer-algorithm header, utilizing an AES-256 encryption key they generate and store locally.*”

The key distinction here is the use of the `x-amz-server-side-encryption-customer-algorithm` header, which is required for encryption operations in this attack. According to AWS [documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html#ssec-and-presignedurl), this SSE-C header is typically specified when creating pre-signed URLs and leveraging SSE-C in S3. This means that the attacker not only encrypts the victim's data but does so in a way that AWS itself does not store the encryption key, rendering recovery impossible without the attacker's cooperation.

### Pre-Signed URLs and Their Role in SSE-C Abuse

**What are pre-signed URLs?**  
[Pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) are signed API requests that allow users to perform specific S3 operations for a limited time. These URLs are commonly used to securely share objects without exposing AWS credentials. A pre-signed URL grants temporary access to an S3 object and can be accessed through a browser or used programmatically in API requests.

In a typical AWS environment, users leverage SDKs or CLI wrappers for pre-signed URLs. However, when using SSE-C, AWS requires additional headers for encryption or decryption.

**SSE-C and Required HTTP Headers**  
When making SSE-C requests — either via the AWS SDK or direct S3 REST API calls — the following headers must be included:

* **x-amz-server-side​-encryption​-customer-algorithm**: Specify the encryption algorithm, but must be AES256 (Noted in Halcyon’s report)  
* **x-amz-server-side​-encryption​-customer-key**: Provides a 256-bit, base64-encoded encryption key for S3 to use to encrypt or decrypt your data  
* **x-amz-server-side​-encryption​-customer-key-MD5**: Provides a base64-encoded 128-bit MD5 digest of the encryption key; S3 uses this header for a message integrity check to ensure that the encryption key was transmitted without error or tampering

When looking for detection opportunities, these details are crucial.

**AWS Signature Version 4 (SigV4) and Its Role**

Requests to S3 are either authenticated or anonymous. Since SSE-C encryption with pre-signed URLs requires [authentication](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html#signing-request-intro), all requests must be cryptographically signed to prove their legitimacy. This is where AWS Signature Version 4 (SigV4) comes in.

AWS SigV4 is an authentication mechanism that ensures API requests to AWS services are signed and verified. This is particularly important for SSE-C operations, as modifying objects in S3 requires authenticated API calls.

For this attack, each encryption request must be signed by:

1. Generating a cryptographic signature using AWS SigV4  
2. Including the signature in the request headers  
3. Attaching the necessary SSE-C encryption headers  
4. Sending the request to S3 to overwrite the object with the encrypted version

Without proper SigV4 signing, AWS would reject these requests. Attacks like the one described by Halcyon rely on compromised credentials, and we know that because the requests were not rejected in our testing. It also suggests that adversaries know they can abuse AWS S3 misconfigurations like improper signing requirements and understand the intricacies of buckets and their respect object access controls.This reinforces the assumption that the attack relied on compromised AWS credentials rather than an exposed, publicly accessible S3 bucket and that the adversaries were skilled enough to understand the nuances with not only S3 buckets and objects but also authentication and encryption in AWS.

# Detonating our Atomic Emulation

Our atomic emulation will use the “compromised” credentials of the IAM user with no login profile who has a permission policy attached that allows several S3 actions to our target bucket. As a reminder, the infrastructure and environment we are conducting this in was deployed from the “Setting Up Infrastructure” section referencing our shared gist.

Below is a step-by-step workflow of the emulation.

1. Load stolen AWS credentials (Retrieved from environment variables)  
2. Establish S3 client with compromised credentials  
3. Generate S3 endpoint URL (Construct the bucket’s URL)  
4. Enumerate S3 objects → s3:ListObjectsV2 (Retrieve object list)  
5. Generate AES-256 encryption key (Locally generated)  
6. Start Loop (For each object in bucket)  
   1. Generate GET request & sign with AWS SigV4 (authenticate request)  
   2. Retrieve object from S3 → s3:GetObject (fetch unencrypted data)  
   3. Generate PUT request & sign with AWS SigV4 (attach SSE-C headers)  
   4. Encrypt & overwrite object in S3 → s3:PutObject (encrypt with SSE-C)  
7. End loop  
8. Apply 7-Day deletion policy → s3:PutLifecycleConfiguration (time-restricted data destruction)  
9. Upload ransom note to S3 → s3:PutObject (Extortion message left for victim)

Below is a visual representation of this emulation workflow:

![Visual representation of emulation workflow](/assets/images/emulating-aws-s3-sse-c/image10.png)

In our Python script, we have intentionally added prompts that require user interaction to confirm they agree to not abuse this script. Another prompt generated during detonation that stalls execution for the user to give time for AWS investigation if necessary before deleting the S3 objects. Since SSE-C is used, the objects are then encrypted with a key the terraform does not have acces to and thus would fail.

Command: `python s3\_sse\_c\_ransom.py detonate`

After detonation, the objects in our S3 bucket will be encrypted with SSE-C, a ransom note will have been uploaded, and an expiration lifecycle will have been added.

![Expected console output when detonating SSE-C ransom emulation](/assets/images/emulating-aws-s3-sse-c/image3.png)

![Expected artifacts in S3 bucket after detonating SSE-C ransom emulation](/assets/images/emulating-aws-s3-sse-c/image5.png)

If you try to access the `customer_data.csv` object, AWS will reject the request because it was stored using server-side encryption. To retrieve the object, a signed request that includes the correct AES-256 encryption key is required.

![Expected error when retrieving objects from S3 bucket after SSE-C encryption](/assets/images/emulating-aws-s3-sse-c/image1.png)

# Cleanup

Cleanup for this emulation is relatively simple. If you choose to keep the S3 objects, start with Step 1, otherwise go straight to step 5\. 

1. Go to `us-east-1` region  
2. navigate to S3  
3. locate the `s3-sse-c-ransomware-payroll-XX bucket`  
4. remove all objects  
5. Command: `python s3\_sse\_c\_ransom.py cleanup`

Once completed, everything deployed initially will be removed.

# Detection and Hunting Strategies

After our atomic emulation, it’s critical to share how we can effectively detect this ransom behavior based on the API event logs provided by AWS’ CloudTrail. Note that we will be leveraging [Elastic Stack](https://www.elastic.co/elastic-stack) for data ingestion and initial query development; however, the query logic and context should be translatable to [your SIEM of choice](https://www.elastic.co/security/siem). It is also important to note that data events for S3 in your CloudTrail configuration should be set to “Log all events.”

## Unusual AWS S3 Object Encryption with SSE-C

The goal of this detection strategy is to identify PutObject requests that leverage SSE-C, as customer-provided encryption keys can be a strong indicator of anomalous activity — especially if an organization primarily uses AWS-managed encryption through KMS (SSE-KMS) or S3's native encryption (SSE-S3).

In our emulation, `PutObject` requests were configured with the `x-amz-server-side-encryption-customer-algorithm` header set to `AES256`, signaling to AWS that customer-provided keys were used for encryption (SSE-C).

Fortunately, AWS CloudTrail logs these encryption details within request parameters, allowing security teams to detect unusual SSE-C usage. Key CloudTrail attributes to monitor include:

* *SignatureVersion*: SigV4 → Signals that this request was signed  
* *SSEApplied: SSE\_C* → Signals that server-side customer key encryption was used  
* *bucketName: s3-sse-c-ransomware-payroll-96* → Signals which bucket this happened to  
* *x-amz-server-side-encryption-customer-algorithm: AES256* → Signals which algorithm was used for the customer encryption key  
* *key: customer\_data.csv* → Indicates the name of the object this was applied to

![Partial Elastic document from CloudTrail ingestion showing SSE-C request from emulation](/assets/images/emulating-aws-s3-sse-c/image9.png)

With these details we can already craft a threat detection query that would match these events and ultimately the threat reported in the original Halcyon blog.

| event.dataset: "aws.cloudtrail" and event.provider: "s3.amazonaws.com" and event.action: "PutObject" and event.outcome: "success" and aws.cloudtrail.flattened.request\_parameters.x-amz-server-side-encryption-customer-algorithm: "AES256" and aws.cloudtrail.flattened.additional\_eventdata.SSEApplied: "SSE\_C" |
| :---- |

While this detection is broad, organizations should tailor it to their environment by asking:

* Do we expect pre-signed URLs with SigV4 for S3 bucket or object operations?  
* Do we expect SSE-C to be used for *PutObject* operations in S3 or this specific bucket?

**Reducing False-Positives With New Term Rule Types**  
To minimize false positives (FPs), we can leverage Elastic’s [New Terms rule type](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-new-terms-rule), which helps detect first-time occurrences of suspicious activity. Instead of alerting on every match, we track unique combinations of IAM users and affected S3 buckets, only generating an alert when this behavior is observed for the first time within a set period. Some of the unique combinations we watch for are:

* Unique IAM users (ARNs) performing SSE-C encryption in S3.  
* Specific buckets where SSE-C is applied.

These alerts only trigger if this activity has been observed for the first time in the last 14 days.

This adaptive approach ensures that legitimate use cases are learned over time, preventing repeated alerts on expected operations. At the same time, it flags anomalous first-time occurrences of SSE-C in S3, aiding in early threat detection. As needed, rule exceptions can be added for specific user identity ARNs, buckets, objects, or even source IPs to refine detection logic. By incorporating historical context and behavioral baselines, this method enhances signal fidelity, improving both the effectiveness of detections and the actionability of alerts.

**Rule References**

[Unusual AWS S3 Object Encryption with SSE-C](https://github.com/elastic/detection-rules/blob/main/rules/integrations/aws/impact_s3_unusual_object_encryption_with_sse_c.toml)  
[Excessive AWS S3 Object Encryption with SSE-C](https://github.com/elastic/detection-rules/blob/main/rules/integrations/aws/impact_s3_excessive_object_encryption_with_sse_c.toml)

# Conclusion

We sincerely appreciate you taking the time to read this publication and, if you did, for trying out the emulation yourself. Whitebox testing plays a crucial role in cloud security, enabling us to replicate real-world threats, analyze their behavioral patterns, and develop effective detection strategies. With cloud-based attacks becoming increasingly prevalent, it is essential to understand the tooling behind adversary tactics and to share research findings with the broader security community.

If you're interested in exploring our AWS detection ruleset, you can find it here: [Elastic AWS Detection Rules](https://github.com/elastic/detection-rules/tree/main/rules/integrations/aws). We also welcome [contributions](https://github.com/elastic/detection-rules/tree/main?tab=readme-ov-file#how-to-contribute) to enhance our ruleset—your efforts help strengthen collective defenses, and we greatly appreciate them!

We encourage anyone with interest to review Halcyon’s publication and thank them ahead of time for sharing their research!

Until next time.

# Important References:

[Halcyon Research Blog on SSE-C ItW](https://www.halcyon.ai/blog/abusing-aws-native-services-ransomware-encrypting-s3-buckets-with-sse-c)  
[Elastic Emulation Code for SSE-C in AWS](https://gist.github.com/terrancedejesus/f703a4a37a70d005080950a418422ac9)  
[Elastic Pre-built AWS Threat Detection Ruleset](https://github.com/elastic/detection-rules/tree/main/rules/integrations/aws)  
[Elastic Pre-built Detection Rules Repository](https://github.com/elastic/detection-rules)  
Rule: [Unusual AWS S3 Object Encryption with SSE-C](https://github.com/elastic/detection-rules/blob/main/rules/integrations/aws/impact_s3_unusual_object_encryption_with_sse_c.toml)  
Rule: [Excessive AWS S3 Object Encryption with SSE-C](https://github.com/elastic/detection-rules/blob/main/rules/integrations/aws/impact_s3_excessive_object_encryption_with_sse_c.toml)
