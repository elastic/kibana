---
title: "Okta and LAPSUS$: What you need to know"
slug: "okta-and-lapsus-what-you-need-to-know"
date: "2022-06-02"
description: "The latest organization under the microscope of the LAPSUS$ group is Okta. Threat hunt for the recent breach targeting Okta users using these simple steps in Elastic"
author:
  - slug: jake-king
image: "blog-security-detection-720x420.png"
category:
  - slug: activity-group
---

> Readers Note:
>
> Elastic has undergone a series of investigations internally and has not yet identified malicious actions that may pertain to this event. Okta has also released two statements relating to the incident in question that may be reviewed [<u>here</u>](https://www.okta.com/blog/2022/03/updated-okta-statement-on-lapsus/) and [<u>here</u>](https://www.okta.com/blog/2022/03/okta-official-statement-on-lapsus-claims/).

## The LAPSUS$ group

Financially motivated adversary groups executing ransomware attacks have rightfully gotten our attention in recent years. Similar to Lulzec, there’s a new group catching attention with different motivations, targeting larger organizations.

The LAPSUS$ group emerged onto the scene a number of months ago, targeting high-profile organizations such as Nvidia, Samsung, and Ubisoft — making various demands that in some cases, resulted in either data dumps or screenshots of internal systems shared via the group’s Telegram account. These were sometimes determined by user-voted polls within the group, suggesting that this is only the beginning of a series of attacks the group is undertaking more frequently as they gain press coverage.

Groups of this nature focus on data theft and extortion via means of social engineering — commonly, targeted spear phishing campaigns.

The latest organization under the microscope of the LAPSUS$ group is Okta, the identity provider for thousands of companies of all sizes. Surprisingly, LAPSUS$ chose to note in their release of information that their targeting of Okta was not for access to Okta’s systems, but rather that of their customers:

![A screenshot of the Telegram account that LAPSUS$ has coordinated, showing access to internal communication, administrative and customer tools, as well as customer accounts](/assets/images/okta-and-lapsus-what-you-need-to-know/1.jpg)

## The latest target: Okta

After LAPSUS$ sent a notification last night to the Telegram account, Okta’s CEO responded with a series of Tweets and an [<u>official statement</u>](https://sec.okta.com/articles/2022/03/official-okta-statement-lapsus-claims) regarding the suspected compromise, stating that it occurred in January 2022, similar to dates visible in the screenshots from Telegram post:

![Todd McKinnon confirmed on Twitter some details surrounding the attack on Okta infrastructure via a subprocessor](/assets/images/okta-and-lapsus-what-you-need-to-know/2.jpg)

![An official statement by David Bradbury, the CSO at Okta, posted March 22](/assets/images/okta-and-lapsus-what-you-need-to-know/3.jpg)

![The updated statement provided by Okta, suggesting that no immediate action by customers is needed](/assets/images/okta-and-lapsus-what-you-need-to-know/4.jpg)

![After this publication, LAPSUS$ published this response](/assets/images/okta-and-lapsus-what-you-need-to-know/5.png)

![Further updates provided by the CSO at Okta at 6.31 PM](/assets/images/okta-and-lapsus-what-you-need-to-know/Okta-CISO-Update.jpg)

While the initial notice provided some insights into potential scope and timing of the incident, many customers are still interested in identifying the scope of the access, and how to assess if there is any local impact within their organization.

The updated notice released by Okta suggested that access was limited to a specific end-user system with no ability to create or delete users or download customer information. However, it did have the ability to reset passwords and MFA tokens for users, while not obtaining access to them. Responses from LAPSUS$ are included for context, and suggest more may need to be investigated.

In the third update notification shared by David Bradbury at Okta, a correction was made indicating that a small (2.5% of customer base) were potentially impacted by the incident. Further details will be shared via a Webinar scheduled at 8AM, PDT Wednesday, March 23rd.. A link to sign up for the webinar is located within the [aforementioned update post.](https://www.okta.com/blog/2022/03/updated-okta-statement-on-lapsus/)

As more information pertaining to the breach is released by either LAPSUS$ or Okta, we will maintain the accuracy of information shared within this post.

## Threat hunting Okta logs in Elastic

The good news is that customers of Okta do have access to relatively comprehensive log information regarding activity within their account. Okta has configured a default 90 day retention window for system events. Okta [<u>released an updated statement</u>](https://www.okta.com/blog/2022/03/updated-okta-statement-on-lapsus/) stating customers do not have to respond to the incident immediately, but for those wishing to investigate further, the following threat hunting information is still valuable.

The process to get started with ingesting Okta logs is simple — a prebuilt integration for Okta Log ingestion is available as a one-click module configurable within Kibana:

![Integrations for Okta are available via One-click installation within the Elastic webapp](/assets/images/okta-and-lapsus-what-you-need-to-know/6.jpg)

Alternatively, the [<u>Okta Filebeat Module</u>](https://www.elastic.co/guide/en/beats/filebeat/master/filebeat-module-okta.html#filebeat-module-okta) can easily be added to Elastic to provide insights into previous account activity.

Configuring the Okta Module is simple, providing you tweak the initial_interval value to 90 days:

```
~ ~ ~
- module: okta
  system:
    var.url: https://yourOktaDomain/api/v1/logs
    var.api_key: XXXX-XXXX...XXXX-XXXX'
    var.initial_interval: 90d # will fetch events starting 90 days ago.
~ ~ ~
```

![A prebuilt dashboard that is shipped alongside the Okta Module for Filebeat](/assets/images/okta-and-lapsus-what-you-need-to-know/7.jpg)

Once events are ingested, a number of Lucene queries are easily leveraged for early/initial signs of compromise. While these events are not a comprehensive set of queries, they should provide ample detail for any security team to investigate potential suspicious activity:

MFA device reset via console for any user:

###### event.module:"okta" AND event.action:"user.mfa.factor.reset_all"

User Account email update records updated to a new value:

###### event.module:"okta" AND event.action:"user.account.update_primary_email"

User Privilege granted for an account within your Okta organization:

###### event.module:"okta" AND event.action:"user.account.privilege.grant"

Okta Administrative staff have a series of privileges that allow for user-impersonation via their management service. Logs pertaining to this action should be inspected:

###### event.module:okta AND (event.action:user.session.impersonation.grant OR event.action:user.session.impersonation.initiate)

There are many other ways to look for suspicious activity in your Okta data. In addition to these queries, Elastic provides a large set of prebuilt detections for suspicious Okta activity used by other adversarial groups in our [<u>open detection-rules repo</u>](https://github.com/elastic/detection-rules/tree/main/rules/integrations/okta). This will be useful in generating alerts as Okta logs are coming into Elastic. You can use the query logic in those rules to drive other hunts beyond the four we mention above as well.

![A snapshot of the current rules pertaining to Okta ingested data within Elastic Security](/assets/images/okta-and-lapsus-what-you-need-to-know/8.png)

> _Not familiar with what suspicious Okta data looks like?_
>
> _Read the_ [<u><em>blog</em></u>](https://www.elastic.co/blog/testing-okta-visibility-and-detection-dorothy) _from December 2020 where we discussed the subject and released an open adversary simulation tool called_ [<u><em>Dorothy</em></u>](https://github.com/elastic/dorothy) _to help security teams test_ _visibility, monitoring, and detection capabilities for Okta logs._
>
> _We expect many security teams will give SSO logs extra attention in light of this incident, and this tool may help teams get up to speed on the subject._

## Earlier events: Microsoft, Nvidia, Samsung, Ubisoft

As previously stated, the LAPSUS$ group has been on a serious compromise train over the past few months, targeting a number of high-profile targets. Numerous details have been shared across a number of different media outlets, and a common theme of social engineering and internal access has been observed across many of the attacks:

- [<u>37GB of Source Code was leaked from Microsoft</u>](https://www.bleepingcomputer.com/news/microsoft/lapsus-hackers-leak-37gb-of-microsofts-alleged-source-code/) in an earlier dump identified this week
- [<u>Ubisoft </u>](https://www.zdnet.com/article/ubisoft-reveals-security-incident-forcing-company-wide-password-refresh/#ftag=RSSbaffb68)- Company-wide password reset after unusual activity identified on systems located
- [<u>Nvidia issues</u>](https://www.zdnet.com/article/ubisoft-reveals-security-incident-forcing-company-wide-password-refresh/#ftag=RSSbaffb68) notice after internal systems indicate data compromise
- [<u>Samsung confirms source-code</u>](https://www.bloomberg.com/news/articles/2022-03-07/samsung-says-hackers-breached-company-data-galaxy-source-code) compromise via the LAPSUS$ group

As further information is uncovered, and mechanisms for detection improve, Elastic Security will continue to provide further updates to this and provide subsequent posts relating to detections.

If you haven’t checked out the Elastic Security solution, take a look at our [<u>Quick Start guides</u>](https://www.elastic.co/training/free#quick-starts) (bite-sized training videos to get you started quickly) or our [<u>free fundamentals training courses</u>](https://www.elastic.co/training/free#fundamentals). You can always get started with a [<u>free 14-day trial of Elastic Cloud</u>](https://cloud.elastic.co/registration). Or [<u>download</u>](https://www.elastic.co/downloads/) the self-managed version of the Elastic Stack for free.
