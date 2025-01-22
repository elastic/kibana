---
title: "Behind the scenes: The making of a Global Threat Report"
slug: "behind-the-scenes-global-threat-report"
date: "2022-11-30"
description: "What was our approach and process for creating a global threat report?"
author:
  - slug: mark-dufresne
image: "gtr-blog-image-720x420.jpg"
category:
  - slug: reports
---

The first [Elastic Global Threat Report](https://www.elastic.co/explore/security-without-limits/global-threat-report) was published earlier this week. In it, you will learn about trends observed by our threat researchers, our predictions for what’s coming next, and some of our recommendations to operate securely in the face of today’s and tomorrow’s threats. If you haven’t read it yet, go [check it out](https://www.elastic.co/explore/security-without-limits/global-threat-report).

As a technical leader in [Elastic Security](http://www.elastic.co/security), I'd like to reveal a small amount about what goes into reports like this one and why it’s significant.

## Why did we do it?

If you didn’t already know this, you know it now: Elastic is a security company. We are also different — we’re open and transparent. We share exactly how our detections and preventions work in the [protections-artifacts](https://github.com/elastic/protections-artifacts) and [detection-rules](https://github.com/elastic/detection-rules) repos. We’ve launched [Elastic Security Labs](https://www.elastic.co/security-labs/) and regularly publish our research, discoveries, and tools. Anyone can spin up a [trial](https://cloud.elastic.co/registration) and try all our features — no barriers, no sales BS. This report is another way we’re bringing transparency to you. We want to empower you by sharing what we know and what we think is coming, and we will continue to expand the scope of what we share in the coming months.

## How'd we do it?

Put simply, by analyzing a vast amount of data. Behind [Elastic Security Labs](http://www.elastic.co/security-labs) is a large team of malware and intelligence analysts, security engineers, researchers, data scientists, and other experts. This team builds and maintains all the protection features in Elastic’s security products: blocking malware, in-memory threats, ransomware, and other malicious behaviors. You name it, we do it. To do this effectively, we need visibility into how our features perform and what threats they’re coming in contact with. We get that visibility through anonymous telemetry shared with us by our users (as well as through research our team carries out on threat feeds and other public datasets).

Our researchers are in the telemetry data daily. Usually, we are focused on the performance of particular features, eliminating false positives and adding protection against emergent techniques, some of which you can learn about in our [threat report](https://www.elastic.co/explore/security-without-limits/global-threat-report). This battle never ends, and we don’t anticipate that changing any time soon.

## Why now?

As our user base rapidly grew over the past year, we came to the conclusion that we now observe a significant percentage of all threats. Upon hitting that critical mass, we decided to peel off some of our best researchers to zoom out, analyze the totality of what we’ve seen, and determine if we had a story worth sharing. We felt we probably had something to contribute to the community’s collective understanding of the threat landscape, and as you read the report, we hope you agree that we were right to think that.

## Diving deeper

With that backdrop, I can share a bit more about how a report like this comes to be. Under the leadership of [Devon Kerr](https://twitter.com/_devonkerr_), we built an eight-week plan to analyze and summarize the telemetry coming in from our various features. All our event telemetry data lives in Elasticsearch, which makes for straightforward summarization and visualization.

Data normalization was a significant challenge. This included filtering out excessively noisy endpoints so results aren’t skewed, ignoring data from test clusters, ignoring alerts for data which we later realized were false positives, pulling together signals from our full [Elastic Security](http://www.elastic.co/security) solution, and more. It wasn’t the most glamorous work in the world, but it was foundational to producing meaningful results at the end. We’ll plan for a couple weeks in this phase again next time — it will always be a significant lift.

Once the data was in good shape, we extracted the meaning from raw aggregations of a massive number of events to determine insights worth sharing, which help us understand the present state of the threat landscape. In particular, we wanted to explain the most prevalent threats we're seeing and put them in context. These are patterns that ebb and flow throughout the year, making an annual overview particularly useful for spotting the threats making the biggest impact. This led to the various charts and statistics laid out in the report. It took us a couple weeks to settle on a list among the team.

Next, we had to write. Devon, [Andy Pease](https://twitter.com/andythevariable), [Daniel Stepanic](https://twitter.com/DanielStepanic), and [Terrance DeJesus](https://twitter.com/_xDeJesus) did the heavy lifting here. Anyone who’s done technical writing knows how important clarity and conciseness are in delivering a message that can be understood by the general public. A few dozen pages came together in a way we’re proud of. Importantly, we partnered closely with [Dhrumil Patel](https://www.linkedin.com/in/pateldhrumil/), our product management lead, and [Jen Ellard,](https://twitter.com/jellard8) security product marketing lead, for the [Threat Report](https://www.elastic.co/explore/security-without-limits/global-threat-report) effort to make sure our points were clear and meaningful to our user base.

All of that brought us to the end of our eight week plan to develop the report. By late August, we were largely pencils-down on the content but far from done. We’re lucky to have a team of designers at Elastic to help us transform a wall of text in a Google doc into a PDF with style and graphics to enhance meaning and help our conclusions and recommendations jump off the page. We knew that this process would take time, many drafts, and a lot of back and forth. Planning and executing this piece of the project took about as long as the data gathering, analysis, and writing. We learned a lot about how long it takes to go from completed draft to final copy and will involve our internal partners early and often in the process.

## Tell us what you think

We’d love to hear your feedback about the first [Elastic Global Threat Report](https://www.elastic.co/explore/security-without-limits/global-threat-report). More is on the way. We expect to make this an annual publication, and between now and then we’re hoping to deliver a more interactive version of this inaugural report.
