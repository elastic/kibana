---
title: "Finding Truth in the Shadows"
slug: "finding-truth-in-the-shadows"
date: "2023-01-26"
description: "Let's discuss three benefits that Hardware Stack Protections brings beyond the intended exploit mitigation capability, and explain some limitations."
author:
  - slug: gabriel-landau
image: "blog-thumb-laser-tunnel.jpg"
category:
  - slug: security-research
---

Microsoft has begun rolling out user-mode [Hardware Stack Protection](https://techcommunity.microsoft.com/t5/windows-kernel-internals-blog/understanding-hardware-enforced-stack-protection/ba-p/1247815) (HSP) starting in Windows 10 20H1. HSP is an exploit mitigation technology that prevents corruption of return addresses on the stack, a common component of [code reuse attacks](https://en.wikipedia.org/wiki/Return-oriented_programming) for software exploitation. Backed by silicon, HSP uses Intel's Control flow Enforcement Technology (CET) and AMD's Shadow Stack, combined with software support [described in great detail](https://windows-internals.com/cet-on-windows/) by Yarden Shafir and Alex Ionescu. Note that the terms HSP and CET are often used interchangeably.

HSP creates a shadow stack, separate from the regular stack. It is read-only in user mode, and consists exclusively of return addresses. Contrast this with the regular stack, which interleaves data with return addresses, and must be writable for applications to function correctly. Whenever a CALL instruction executes, the current instruction pointer (aka return address) is pushed onto both the regular and shadow stacks. Conversely, RET instructions pop the return address from both stacks, generating an exception if they mismatch. In theory, ROP attacks are mitigated because attackers can't write arbitrary values to the read-only shadow stack, and changing the Shadow Stack Pointer (SSP) is a privileged operation, making pivots impossible.

Today we’re going to discuss three additional benefits that HSP brings, beyond the intended exploit mitigation capability, then go into some limitations.

# Debugging

Although designed as an exploit mitigation, HSP provides useful data for other purposes. Modern versions of [WinDbg](https://apps.microsoft.com/store/detail/windbg-preview/9PGJGD53TN86?hl=en-us&gl=us) will display a hint to the user that they can use SSP as an alternate way to recover a stack trace. This can be very useful when debugging stack corruption bugs that overwrite return addresses, because the shadow stack is independent. It's also useful in situations where the stack unwind data is unavailable.

For example, see the WinDbg output below for a process memory dump. The `k` command displays a regular stack trace. `dps @ssp` resolves all symbols it can find, starting at SSP - this is essentially a shadow stack trace. Note how the two stack traces are identical except for the first frame:

![Note the similarities](/assets/images/finding-truth-in-the-shadows/image3.png)

# Performance

Kernel mode components such as EDR and ETW often capture stack traces to provide additional context to each event. On x64 platforms, a stack walk entails capturing the thread’s context, then looking up a data structure for each frame that enables the walker to "unwind" it and find the next frame. These lookups were slow enough that Microsoft saw fit to construct a [multi-tier cache system](http://uninformed.org/index.cgi?v=8&a=2&p=20) when they added x64 support. You can see the traverse/unwind process approximated [here](https://github.com/reactos/reactos/blob/11a71418d50f48ff0e10d2dbbe243afaf34c4368/sdk/lib/rtl/amd64/unwind.c#L909C6-L1011) in ReactOS, sans cache.

Given that the entire shadow stack likely resides on a single page and no unwinding is required, shadow stack walking is probably more performant than traditional stack walking, though this has yet to be proven.

# Detection

The shadow stack provides an interesting detection opportunity. Adversaries can use techniques demonstrated in [ThreadStackSpoofer](https://github.com/mgeeky/ThreadStackSpoofer/tree/master) and [CallStackSpoofer](https://github.com/WithSecureLabs/CallStackSpoofer) to obfuscate their presence against thread stack scans (e.g. `StackWalk64`) and inline stack traces like [Sysmon Open Process events](https://www.lares.com/blog/hunting-in-the-sysmon-call-trace/).

By comparing a traditional stack walk against its shadowy sibling, we can both detect and bypass thread stack spoofing. We present [ShadowStackWalk](https://github.com/gabriellandau/ShadowStackWalk), a PoC that implements CaptureStackBackTrace/StackWalk64 using the shadow stack to catch thread stack spoofing.

When the stack is normal, ShadowStackWalk functions similarly to `CaptureStackBackTrace` and `StackWalk64`:

![ShadowStackWalk normal stack](/assets/images/finding-truth-in-the-shadows/image7.jpg)

ShadowStackWalk is unaffected by intentional breaks of the call stack such as [ThreadStackSpoofer](https://github.com/mgeeky/ThreadStackSpoofer/blob/f67caea38a7acdb526eae3aac7c451a08edef6a9/ThreadStackSpoofer/main.cpp#L20-L25). Frames missed by other techniques are in green:

![ShadowStackWalk encounters a broken call stack](/assets/images/finding-truth-in-the-shadows/image8.jpg)

ShadowStackWalk doesn't care about forged stack frames. Incorrect frames are in red. Frames missed by other techniques are in green:

![Forged stack frames? No Problem.](/assets/images/finding-truth-in-the-shadows/image9.jpg)

# Limitations

Hardware support for HSP is limited. HSP requires at least an 11th-gen Intel or 5000-series Ryzen CPU, both released in late 2020. There is no software emulation. It will take years for the majority of CPUs to support HSP.

Software support for HSP is limited. Microsoft has been slowly rolling it out, even among their own processes. On an example Windows 10 22H2 workstation, it's enabled in roughly 40% of processes. Because HSP is an exploit mitigation, implementation will likely start with common exploitation targets like web browsers, though not all msedge.exe processes shown below are not protected by it. As HSP matures and support improves, non-HSP processes will become outliers worthy of additional scrutiny, similar to processes in 2023 without DEP support. For now, malware can simply choose processes without HSP enabled. Also of note is that HSP does not support WOW64 at all.

![Software support for HSP is limited, even among Microsoft's processes (in red). Contrasted (in blue) against mature technologies like DEP and ASLR](/assets/images/finding-truth-in-the-shadows/image2.jpg)

HSP was designed with an exploit mitigation threat model. It was never designed to defend against adversaries who have code execution, can change thread contexts, and perform system calls. In time, adversaries will adapt their call stack manipulations to manipulate the shadow stack as well. However, the fact that the shadow stack is user-RO and changing the SSP is privileged operation means that such tampering requires system calls which can (theoretically) be subjected to far more scrutiny than traditional stack tampering.

# Conclusion

Today we discussed three potential benefits of Windows Hardware Stack Protection, and released [a PoC](https://github.com/gabriellandau/ShadowStackWalk) demonstrating how it can be used to both detect and defeat defense evasions that manipulate the call stack.
