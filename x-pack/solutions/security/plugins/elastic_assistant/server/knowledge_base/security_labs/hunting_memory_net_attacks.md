---
title: "Hunting For In-Memory .NET Attacks"
slug: "hunting-memory-net-attacks"
date: "2022-06-21"
description: "As a follow up to my DerbyCon presentation, this post will investigate an emerging trend of adversaries using .NET-based in-memory techniques to evade detection"
author:
  - slug: joe-desimone
image: "photo-edited-04@2x.jpg"
category:
  - slug: security-research
---

![Hunting-memory-hunting_in_memory_.net_1.png](/assets/images/hunting-memory-net-attacks/Hunting-memory-hunting_in_memory_.net_1.png)

In past blog posts, we shared our [approach](https://www.endgame.com/blog/technical-blog/hunting-memory) to hunting for traditional in-memory attacks along with in-depth [analysis](https://www.endgame.com/blog/technical-blog/ten-process-injection-techniques-technical-survey-common-and-trending-process) of many injection techniques. As a follow up to my DerbyCon [presentation](https://www.endgame.com/resource/video/derbycon-talk-hunting-memory-resident-malware), this post will investigate an emerging [trend](https://securelist.com/the-rise-of-net-and-powershell-malware/72417/) of adversaries using .NET-based in-memory techniques to evade detection. I’ll discuss both eventing (real-time) and on-demand based detection strategies of these .NET techniques. At Endgame, we understand that these differing approaches to detection and prevention are complimentary, and together result in the most robust defense against in-memory attacks.

## The .NET Allure

Using .NET in-memory techniques, or even standard .NET applications, are attractive to adversaries for several reasons. First and foremost, the [.NET framework](https://en.wikipedia.org/wiki/.NET_Framework) comes [pre-installed](https://blogs.msdn.microsoft.com/astebner/2007/03/14/mailbag-what-version-of-the-net-framework-is-included-in-what-version-of-the-os/) in all Windows versions. This is important as it enables the attackers’ malware to have maximum compatibility across victims. Next, the .NET PE metadata format itself is fairly [complicated](http://www.ntcore.com/files/dotnetformat.htm). Due to resource constraints, many endpoint security vendors have limited insight into the managed (.NET) structures of these applications beyond what is shared with vanilla, unmanaged (not .NET) applications. In other words, most AVs and security products don’t defend well against malicious .NET code and adversaries know it. Finally, the .NET framework has built-in functionality to dynamically load memory-only modules through the [Assembly.Load(byte[])](<https://msdn.microsoft.com/en-us/library/system.reflection.assembly.load(v=vs.110).aspx>) function (and its various overloads). This function allows attackers to easily craft crypters/loaders, keep their payloads off disk, and even bypass application whitelisting solutions like [Device Guard](https://docs.microsoft.com/en-us/windows/device-security/device-guard/introduction-to-device-guard-virtualization-based-security-and-code-integrity-policies). This post focuses on the Assembly.Load function due to the robust set of attacker capabilities it supports.

## .NET Attacker Techniques

Adversaries leveraging .NET in-memory techniques is not completely new. However, in the last six months, there has been a noticeable uptick in tradecraft, which I’ll briefly discuss to illustrate the danger. For instance, in 2014, DEEP PANDA, a threat group suspected of operating out of China, was [observed](https://www.crowdstrike.com/blog/deep-thought-chinese-targeting-national-security-think-tanks/) using the multi-stage MadHatter implant which is written in .NET. More interestingly, this implant exists only in memory after a multi stage Assembly.Load bootstrapping process that begins with PowerShell. PowerShell can directly call .NET methods, and the Assembly.Load function being no exception. It is as easy as calling [System.Reflection.Assembly]::Load($bin). More recently, the [OilRig](https://researchcenter.paloaltonetworks.com/2017/10/unit42-oilrig-group-steps-attacks-new-delivery-documents-new-injector-trojan/) APT Group used a packed .NET malware sample known as ISMInjector to evade signature based detection. During the unpacking routine, the sample uses the Assembly.Load function to access the embedded next stage malware known as [ISMAgent](https://researchcenter.paloaltonetworks.com/2017/07/unit42-oilrig-uses-ismdoor-variant-possibly-linked-greenbug-threat-group/).

A third example, more familiar to red teams, is [ReflectivePick](https://github.com/PowerShellEmpire/PowerTools/blob/master/PowerPick/ReflectivePick/ReflectivePick.cpp) by [Justin Warner](https://twitter.com/sixdub) and [Lee Christensen](https://twitter.com/tifkin_). ReflectivePick allows PowerShell Empire to inject and bootstrap PowerShell into any running process. It leverages the Assembly.Load() method to load their PowerShell runner DLL without dropping it to disk. The image below shows the relevant source code of their tool.

![Hunting-memory-load-assembly-from-memory-2.jpg](/assets/images/hunting-memory-net-attacks/Hunting-memory-load-assembly-from-memory-2.jpg)

It is important to point out that Assembly.Load, being a core function of the .NET framework, is often used in legitimate programs. This includes built-in Microsoft applications, which has led to an interesting string of defense evasion and application whitelisting bypasses. For example, [Matt Graeber](https://twitter.com/mattifestation) discovered a Device Guard bypass that targets a race condition to hijack legitimate calls to Assembly.Load, allowing an attacker to execute any unsigned .NET code on a Device Guard protected host. Because of the difficulty in fixing such a technique, Microsoft currently has decided not to service this issue, leaving attackers a convenient “forever-day exploit” against hosts that are hardened with application whitelisting.

[Casey Smith](https://twitter.com/subTee) also has published a ton of research bypassing application whitelisting solutions. A number of these techniques, at their core, target signed Microsoft applications that call the Assembly.Load method with attacker-supplied code. One example is MSBuild, which comes pre-installed on Windows and allows attackers to execute unsigned .NET code inside a legitimate and signed Microsoft process. These techniques are not JUST useful to attackers who are targeting application whitelisting protected environments. Since they allow attacker code to be loaded into legitimate signed processes in an unconventional manner, most anti-virus and EDR products are blind to the attacker activity and can be bypassed.

Finally, [James Forshaw](https://twitter.com/tiraniddo) developed the [DotNetToJScript](https://github.com/tyranid/DotNetToJScript) technique. At its heart, this technique leverages the BinaryFormatter deserialization method to load a .NET application using only JScript. Interestingly enough, the technique under the hood will make a call to the Assembly.Load method. DotNetToJscript opened the door for many new clever techniques for executing unsigned .NET code in a stealthy manner. For example, James [demonstrated](https://bugs.chromium.org/p/project-zero/issues/detail?id=1081) how to combine DotNetToJScript with [com hijacking](https://www.endgame.com/blog/technical-blog/how-hunt-detecting-persistence-evasion-com) and Casey’s squiblydoo technique to inject code into [protected processes](http://www.alex-ionescu.com/?p=97). In another example, Casey weaponized DotNetToJScript in universal.js to execute arbitrary shellcode or PowerShell commands.

The number of Microsoft-signed applications that be can be abused to execute attacker code in a stealthy manner is dizzying. Fortunately, the community has been quick to document and track them publically in a number of places. One good reference is [Oddvar Moe’s](https://twitter.com/Oddvarmoe) [UltimateAppLockerByPassList](https://github.com/api0cradle/UltimateAppLockerByPassList), and another is Microsoft’s own [reference](https://docs.microsoft.com/en-us/windows/device-security/device-guard/deploy-code-integrity-policies-steps).

## Detecting .NET Attacks

As these examples illustrate, attackers are leveraging .NET in various ways to defeat and evade endpoint detection. Now, let’s explore two approaches to detecting these attacks: on-demand and real-time-based techniques.

### On-demand detection

On-demand detection leverages snapshots in time-type data collection. You don’t need a persistent agent running and collecting data when the attack takes place, but you do need the malicious code running during the hunt/collection time. The trick is to focus on high-value data that can capture actor-agnostic techniques, and has a high signal-to-noise ratio. One example is the [Get-InjectedThread](https://gist.github.com/jaredcatkinson/23905d34537ce4b5b1818c3e6405c1d2) script for detecting traditional unmanaged in-memory injection techniques. To demonstrate detecting .NET malware usage of the Assembly.Load function, I leverage PowerShell Empire by [Will Schroeder](https://twitter.com/harmj0y) and others. Empire allows you to inject an agent into any process by remotely bootstrapping PowerShell. As you see below, after injection calc.exe has loaded the PowerShell core library System.Management.Automation.ni.dll.

![Hunting-memory-calc.exe.2888-3.jpg](/assets/images/hunting-memory-net-attacks/Hunting-memory-calc.exe.2888-3.jpg)

This fact alone can be interesting, but a surprisingly large number of legitimate applications load PowerShell. Combining this with process network activity and looking for outliers across all your data may give you better mileage. Upon deeper inspection, we see something even more interesting. As shown below, memory section 0x2710000 contains a full .NET module (PE header present). The characteristics of the memory region are a bit unusual. The type is [MEM_MAPPED](<https://msdn.microsoft.com/en-us/library/windows/desktop/aa366775(v=vs.85).aspx>), although there is no associated file mapping object (Note the “Use” field is empty in ProcessHacker). Lastly, the region has a protection of PAGE_READWRITE, which surprisingly is not executable. These memory characteristics are a [side effect](https://github.com/dotnet/coreclr/blob/3452efb58d2f3be867080f8627417b264fcbd73c/src/vm/peimagelayout.cpp#L259) of loading a memory-only module with the Assembly.Load(byte[]) method.

![Hunting-memory-calc.exe.2888.properties-4.jpg](/assets/images/hunting-memory-net-attacks/Hunting-memory-calc.exe.2888.properties-4.jpg)

To automate this type of hunt, I wrote a PowerShell function called [Get-ClrReflection](https://gist.github.com/dezhub/2875fa6dc78083cedeab10abc551cb58) which looks for this combination of memory characteristics and will save any hits for further analysis. Below is sample output after running it against a workstation that was infected with Empire.

![Hunting-memory-Users-joe-desktop-5.jpg](/assets/images/hunting-memory-net-attacks/Hunting-memory-Users-joe-desktop-5.jpg)

Once again, you will see hits for legitimate applications that leverage the Assembly.Load function. One common false positive is for XmlSerializer generated assemblies. Standard hunt practices apply. Bucket your hits by process name or better yet with a fuzzy hash match. For example, ClrGuard (details next) will give you TypeRef hash with a “-f” switch. Below is an example from Empire.

![Hunting-memory-TypeRef-System-String-6.jpg](/assets/images/hunting-memory-net-attacks/Hunting-memory-TypeRef-System-String-6.jpg)

### Eventing-based detection

Eventing-based detecting is great because you won’t need luck that an adversary is active while you are hunting. It also gives you an opportunity to prevent attacker techniques in real-time. To provide signals into the CLR on which .NET runs, we developed and released [ClrGuard](https://github.com/endgameinc/ClrGuard). ClrGuard will hook into all .NET processes on the system. From there, it performs an in-line hook of the native LoadImage() function. This is what Assembly.Load() calls under the CLR hood. When events are observed, they are sent over a named pipe to a monitoring process for further introspection and mitigation decision. For example, Empire’s psinject function can be immediately detected and blocked in real-time as shown in the image below.

![Hunting-memory-CLR-Guard-7.jpg](/assets/images/hunting-memory-net-attacks/Hunting-memory-CLR-Guard-7.jpg)

In a similar manner, OilRig’s ISMInjector can be quickly detected and blocked.

![Hunting-memory-Client-connected-endgame-8.jpg](/assets/images/hunting-memory-net-attacks/Hunting-memory-Client-connected-endgame-8.jpg)

Another example below shows ClrGuard in action against Casey Smith’s universal.js tool.

![Hunting-memory-Administrator-endgame-9.gif](/assets/images/hunting-memory-net-attacks/Hunting-memory-Administrator-endgame-9.gif)

While we don’t recommend you run ClrGuard across your enterprise (it is Proof of Concept grade), we hope it spurs community discussion and innovation against these types of .NET attacks. These sorts of defensive techniques power protection across the Endgame product, and an enterprise-grade ClrGuard-like feature will be coming soon.

## Conclusion

It is important to thank those doing great offensive security research who are willing to publish their capabilities and tradecraft for the greater good of the community. The recent advancements in .NET in-memory attacks have shown that it is time for defenders to up their game and go toe-to-toe with the more advanced red teams and adversaries. We hope that ClrGuard and Get-ClrReflection help balance the stakes. These tools can increase a defenders optics into .NET malware activities, and raise visibility into this latest evolution of attacker techniques.
