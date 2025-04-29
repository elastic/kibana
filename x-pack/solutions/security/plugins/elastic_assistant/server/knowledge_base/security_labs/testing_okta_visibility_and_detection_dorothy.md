---
title: "Testing your Okta visibility and detection with Dorothy and Elastic Security"
slug: "testing-okta-visibility-and-detection-dorothy"
date: "2022-06-02"
description: "Dorothy is a tool for security teams to test their visibility and detection capabilities for their Okta environment. IAM solutions are frequently targeted by adversaries but poorly monitored. Learn how to get started with Dorothy in this post."
author:
  - slug: david-french
image: "blog-thumb-dorothy-cow.jpg"
category:
  - slug: security-research
---

When approached by stakeholders in their organization, few security teams can confidently demonstrate that logging and alerting capabilities are working as expected. Organizations have become more distributed and reliant on cloud offerings for use cases such as identity and access management, user productivity, and file storage. Meanwhile, adversaries have extended their operational capabilities in cloud environments. It is crucial that security teams are able to monitor these systems for abuse in order to protect their organization’s data from attack.

[Dorothy](https://github.com/elastic/dorothy) is a free and open tool to help security teams test their visibility, monitoring, and detection capabilities for Okta Single Sign-On (SSO) environments. We’ll demonstrate how Dorothy can be used to execute tests and how [Elastic Security](https://www.elastic.co/security) can be used to alert on relevant and suspicious behavior using our [free and open detection rules](https://github.com/elastic/detection-rules/).

## What is Okta SSO?

For those who aren’t familiar, [Okta SSO](https://www.okta.com/products/single-sign-on/) is a cloud-based identity management solution that allows users to authenticate to a variety of systems and applications within their organization using a single user account. Informing end users that they only have to remember _one_ username and password instead of ten or more reduces the risk that they’ll develop poor password hygiene and enables system administrators to enforce stronger password policies. Further, multi-factor authentication (MFA) policies can be configured in Okta, which raises the barrier to entry for attackers. Many attackers will simply move on and look for an easier target when they discover that MFA is enforced in their target’s network or user account.

While SSO solutions can provide a convenient user experience and reduce cybersecurity risk for an organization, these centralized systems offer a type of skeleton key to many systems and applications, and are often an attractive target for attackers. It’s critical that security teams understand what normal behavior looks like in their Okta environment so that they can identify suspicious activity more easily.

## Meet Dorothy

[Dorothy](https://github.com/elastic/dorothy) has 25+ modules to simulate actions an attacker may take while operating in an Okta environment and behavior that security teams should monitor for, detect, and alert on. All modules are mapped to the relevant [MITRE ATT&CK®](https://attack.mitre.org/) tactics, such as Persistence, Defense Evasion, Discovery, and Impact.

![Figure 1 - Starting Dorothy and listing its modules](/assets/images/testing-okta-visibility-and-detection-dorothy/1-Dorothy-blog-listing-modules.png)

Dorothy was created to help defenders test their security visibility and controls, and does not provide any modules to obtain initial access or escalate privileges in an Okta environment. To execute actions using Dorothy, a valid Okta API token is required that is linked to a user with one or more administrator roles assigned.

A user-friendly shell interface with contextual help is provided for navigation between menus and modules, helping guide the user through simulated intruder scenarios. Other features include configuration profiles to manage connections to individual Okta environments and detailed logging with the option of indexing events into Elasticsearch to provide an audit trail of the actions that were executed using Dorothy.

## Executing actions in an Okta environment using Dorothy

In this section, we demonstrate how to execute some of Dorothy’s modules in an Okta environment. Figure 2 below shows the typical workflow for an Elastic Security user. After this demonstration, you should be comfortable with heading over to Dorothy’s GitHub repository and following the “Getting Started” steps in the project’s [wiki](https://github.com/elastic/dorothy/wiki).

![Figure 2 - Example workflow for executing actions in an Okta environment using Dorothy](/assets/images/testing-okta-visibility-and-detection-dorothy/2-Dorothy-blog-example_workflow.png)

### whoami?

Let’s put ourselves in an attacker's shoes and think about what actions they might take while operating in an Okta environment. As an attacker with an initial foothold, the first questions I'll have are about the user for which I have an API token. Let's simulate this attacker action through Dorothy's whoami command to look at the associated user’s login ID, last login time, and last password change.

Now that we have a better understanding of the user account we have control of, we’ll list Dorothy’s modules and check out the help menu before making our next move.

<Video vidyard_uuid="iG2cr4pHfUSwwVyk3paivS" />

_Figure 3 - Executing Dorothy’s whoami and list-modules commands_

### Discovery

Dorothy has several discovery modules we can use to simulate the knowledge an attacker might obtain about an Okta environment. Adversaries will often spend time to learn details of an environment after obtaining initial access — details that are essential for orienting themselves before planning their next steps.

Let’s try and gain some knowledge about the Okta environment by harvesting the following information:

- Users - A list of names, login IDs, email addresses, password recovery questions, and the status of each user will be useful when choosing which accounts to take control of, modify, or leave intact to avoid detection
- Policies - [Okta policies](https://help.okta.com/en/prod/Content/Topics/Security/Security_Policies.htm) are used to control elements of security, including password complexity and MFA requirements, as well as the devices that users are permitted to use. This knowledge will come in handy if we decide to weaken some components of the target’s security configuration
- Zones - [Network zones](https://help.okta.com/en/prod/Content/Topics/Security/network/network-zones.htm) can be used to define security perimeters for an Okta environment. Similar to policies, this information helps us learn how the environment is configured and make informed decisions before implementing any changes on how traffic is allowed or blocked

Finally, we’ll execute the find-admins module to enumerate the roles of each Okta user and identify which users have one or more administrator roles assigned to them.

<Video vidyard_uuid="TkDuAJQwKabkyj375rfYPe" />

_Figure 4 - Executing Dorothy’s “discovery” modules to gain knowledge about the Okta environment_

Other discovery modules to help with information gathering tasks include find-users-without-mfa to find users who may authenticate using only a username and password and find-admin-groups to identify user groups that have one or more administrator roles assigned to them.

### Persistence

Once an attacker has obtained access to their target environment, they may look for opportunities to establish persistence. Persistence helps an attacker maintain access in the event that they lose their initial foothold. A common example of how an adversary might lose their access is when the security team detects their presence and disables the compromised user account that the attacker is utilizing or blocks their communications at the network perimeter.

Having one or more persistence mechanisms in place means that the attacker will be able to continue their mission if one of their pathways is blocked or interrupted. In this example, we’ll use Dorothy's create-user and create-admin-user modules to create an Okta user and [assign an administrator role](https://github.com/elastic/detection-rules/blob/main/rules/okta/persistence_administrator_role_assigned_to_okta_user.toml) to the new user. Next, we'll create a recovery question for another Okta user so that we can go through the process of resetting the password for that user and take control of their account as another method of persistence.

<Video vidyard_uuid="GBE6rQG2gxPGLhysSSTZet" />

Dorothy has other persistence modules to help us understand the steps an attacker might take, such as reset-factors to [remove a user's enrolled authentication factors](https://github.com/elastic/detection-rules/blob/main/rules/okta/persistence_attempt_to_reset_mfa_factors_for_okta_user_account.toml) and reset-password to generate a one-time link to reset a user's password.

### Defense Evasion

Adversaries will attempt to execute defense evasion techniques to avoid detection throughout their mission. For example, an attacker may attempt to disable security logging to render the security team blind to their nefarious actions.

At this point, we’ve gained knowledge about the environment and configured a couple of forms of persistence. Let’s execute Dorothy's [change-policy-state](https://github.com/elastic/detection-rules/blob/main/rules/okta/okta_attempt_to_deactivate_okta_policy.toml) and [change-zone-state](https://github.com/elastic/detection-rules/blob/main/rules/okta/attempt_to_deactivate_okta_network_zone.toml) modules to weaken the “target's” security controls.

<Video vidyard_uuid="ibEzpdD2KPKKK83d3n556d" />

_Figure 6 - Deactivating Okta policy and network zone objects_

Other defense evasion-themed modules can activate, deactivate, or modify other Okta objects such as applications and individual policy rules.

We’ll stop our fictitious attack scenario here, but if you’re curious to learn what else Dorothy can do, head over to the [GitHub repository](https://github.com/elastic/dorothy).

## Detecting suspicious behavior with Elastic Security

In this section, we'll demonstrate how Okta's [system log](https://help.okta.com/en/prod/Content/Topics/Reports/Reports_SysLog.htm) powers our free detection rules to monitor for and alert teams to suspicious behavior.

Okta's system log provides an audit trail of activity that was observed in an organization's environment. This includes activity such as users logging in or changing their password, administrators making configuration changes, and much more. This data source is incredibly useful for security monitoring, investigations, compliance, and response activities.

### Ingesting Okta system logs with Fleet

[Fleet](https://www.elastic.co/guide/en/fleet/current/fleet-overview.html) provides a web-based UI in Kibana to add and manage integrations for popular services and platforms including Okta, AWS, Azure, Google Cloud Platform, Google Workspace, and many others. Fleet’s Okta integration provides an easy way to ingest and normalize Okta’s system log events.

![Figure 7 - Reviewing Fleet’s Okta integration in Kibana](/assets/images/testing-okta-visibility-and-detection-dorothy/7-Dorothy-blog-reviewing-fleet.png)

An [Okta Filebeat module](https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-okta.html) is also available for teams that already use Beats.

### Detecting suspicious behavior with Elastic Security’s free detection rules

The Elastic Security Protections Team researches adversary tradecraft in order to develop detections and preventions for endpoint, cloud, and network platforms. Our [detection rules](https://github.com/elastic/detection-rules) are free and developed in the open alongside the broader security community.

Our Okta rules utilize the indexed system log events that are normalized into [Elastic Common Schema (ECS)](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html) and alert security teams to relevant and suspicious behavior.

Figure 8 below shows a number of alerts in Elastic Security after Dorothy was used to simulate actions that an attacker might take while operating in an Okta environment.

![Figure 8 - Reviewing open alerts in Elastic Security](/assets/images/testing-okta-visibility-and-detection-dorothy/8-Dorothy-blog-reviewing-alerts.png)

What about those pesky false positives? Adding exceptions to rules in Elastic Security to filter routine and expected behavior is straightforward. This feature includes an option to close all alerts that match the exception to save you time.

![Figure 9 - Adding an exception to an Okta rule in Elastic Security](/assets/images/testing-okta-visibility-and-detection-dorothy/9-Dorothy-blog-adding_exception.jpg)

## Measure your cloud cover with Dorothy

Okta and other identity management solutions are frequently targeted by adversaries, but are often poorly monitored, if at all. We created Dorothy as a tool to help security teams understand how adversaries can operate within Okta environments, further empowering them to test their visibility and efficacy of our free and open detection rules.

You can learn how to get started with Dorothy by visiting the project’s [wiki](https://github.com/elastic/dorothy/wiki). If you're not already an Elastic Security user, you can sign up for a [free cloud trial](https://www.elastic.co/cloud/) today and check out our free [detection rules](https://www.elastic.co/blog/elastic-security-opens-public-detection-rules-repo).
