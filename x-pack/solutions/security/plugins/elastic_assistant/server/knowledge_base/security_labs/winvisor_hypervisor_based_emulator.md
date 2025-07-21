---
title: "WinVisor – A hypervisor-based emulator for Windows x64 user-mode executables"
slug: "winvisor-hypervisor-based-emulator"
date: "2025-01-24"
subtitle: "A proof-of-concept hypervisor-based emulator for Windows x64 binaries"
description: "WinVisor is a hypervisor-based emulator for Windows x64 user-mode executables that leverages the Windows Hypervisor Platform API to provide a virtualized environment for logging syscalls and enabling memory introspection."
author:
  - slug: elastic-security-labs
image: "winvisor.jpg"
category:
  - slug: perspectives
tags:
  - onweek
  - winvisor
---

## Background

In Windows 10 (version RS4), Microsoft introduced the [Windows Hypervisor Platform](https://learn.microsoft.com/en-us/virtualization/api/hypervisor-platform/hypervisor-platform) (WHP) API. This API exposes Microsoft's built-in hypervisor functionality to user-mode Windows applications. In 2024, the author used this API to create a personal project: a 16-bit MS-DOS emulator called [DOSVisor](https://github.com/x86matthew/DOSVisor). As mentioned in the release notes, there have always been plans to take this concept further and use it to emulate Windows applications. Elastic provides a research week (ON Week) twice per year for staff to work on personal projects, providing a great opportunity to begin working on this project. This project will be (unimaginatively) named WinVisor, inspired by its DOSVisor predecessor.

Hypervisors provide hardware-level virtualization, eliminating the need to emulate the CPU via software. This ensures that instructions are executed exactly as they would be on a physical CPU, whereas software-based emulators often behave inconsistently in edge cases.

This project aims to build a virtual environment for executing Windows x64 binaries, allowing syscalls to be logged (or hooked) and enabling memory introspection. The goal of this project is not to build a comprehensive and secure sandbox - by default, all syscalls will simply be logged and forwarded directly to the host. In its initial form, it will be trivial for code running within the virtualized guest to "escape" to the host. Safely securing a sandbox is a difficult task, and is beyond the scope of this project. The limitations will be described in further detail at the end of the article.

Despite having been available for 6 years (at the time of writing), it seems that the WHP API hasn’t been used in many public projects other than complex codebases such as [QEMU](https://github.com/qemu/qemu) and [VirtualBox](https://www.virtualbox.org/). One other notable project is Alex Ionescu's [Simpleator](https://github.com/ionescu007/Simpleator) - a lightweight Windows user-mode emulator that also utilizes the WHP API. This project has many of the same goals as WinVisor, although the approach for implementation is quite different. The WinVisor project aims to automate as much as possible and support simple executables (e.g. `ping.exe`) universally out of the box.

This article will cover the general design of the project, some of the issues that were encountered, and how they were worked through. Some features will be limited due to development time constraints, but the final product will at least be a usable proof-of-concept. Links to the source code and binaries hosted on GitHub will be provided at the end of the article.

### Hypervisor basics

Hypervisors are powered by VT-x (Intel) and AMD-V (AMD) extensions. These hardware-assisted frameworks enable virtualization by allowing one or more virtual machines to run on a single physical CPU. These extensions use different instruction sets and, therefore, are not inherently compatible with each other; separate code must be written for each.

Internally, Hyper-V uses `hvix64.exe` for Intel support and `hvax64.exe` for AMD support. Microsoft's WHP API abstracts these hardware differences, allowing applications to create and manage virtual partitions regardless of the underlying CPU type. For simplicity, the following explanation will focus solely on VT-x.

VT-x adds an additional set of instructions known as VMX (Virtual Machine Extensions), containing instructions such as `VMLAUNCH`, which begins the execution of a VM for the first time, and `VMRESUME`, which re-enters the VM after a VM exit. A VM exit occurs when certain conditions are triggered by the guest, such as specific instructions, I/O port access, page faults, and other exceptions. 

Central to VMX is the Virtual Machine Control Structure (VMCS), a per-VM data structure that stores the state of the guest and host contexts as well as information about the execution environment. The VMCS contains fields that define processor state, control configurations, and optional conditions that trigger transitions from the guest back to the host. VMCS fields can be read or written to using the `VMREAD` and `VMWRITE` instructions.

During a VM exit, the processor saves the guest state in the VMCS and transitions back to the host state for hypervisor intervention.

## WinVisor overview

This project takes advantage of the high-level nature of the WHP API. The API exposes hypervisor functionality to user-mode and allows applications to map virtual memory from the host process directly into the guest's physical memory.

The virtual CPU operates almost exclusively in CPL3 (user-mode), except for a small bootloader that runs at CPL0 (kernel-mode) to initialize the CPU state before execution. This will be described in further detail in the Virtual CPU section.

Building up the memory space for an emulated guest environment involves mapping the target executable and all DLL dependencies, followed by populating other internal data structures such as the Process Environment Block (PEB), Thread Environment Block (TEB), `KUSER_SHARED_DATA`, etc.

Mapping the EXE and DLL dependencies is straightforward, but accurately maintaining internal structures, such as the PEB, is a more complex task. These structures are large, mostly undocumented, and their contents can vary between Windows versions. It would be relatively simple to populate a minimalist set of fields to execute a simple "Hello World" application, but an improved approach should be taken to provide good compatibility.

Instead of manually building up a virtual environment, WinVisor launches a suspended instance of the target process and clones the entire address space into the guest. The Import Address Table (IAT) and Thread Local Storage (TLS) data directories are temporarily removed from the PE headers in memory to stop DLL dependencies from loading and to prevent TLS callbacks from executing before reaching the entry point. The process is then resumed, allowing the usual process initialization to continue (`LdrpInitializeProcess`) until it reaches the entry point of the target executable, at which point the hypervisor launches and takes control. This essentially means that Windows has done all of the hard work for us, and we now have a pre-populated user-mode address space for the target executable that is ready for execution.

A new thread is then created in a suspended state, with the start address pointing to the address of a custom loader function. This function populates the IAT, executes TLS callbacks, and finally executes the original entry point of the target application. This essentially simulates what the main thread would do if the process were being executed natively. The context of this thread is then "cloned" into the virtual CPU, and execution begins under the control of the hypervisor.

Memory is paged into the guest as necessary, and syscalls are intercepted, logged, and forwarded to the host OS until the virtualized target process exits.

As the WHP API only allows memory from the current process to be mapped into the guest, the main hypervisor logic is encapsulated within a DLL that gets injected into the target process.

## Virtual CPU

The WHP API provides a "friendly" wrapper around the VMX functionality described earlier, meaning that the usual steps, such as manually populating the VMCS before executing `VMLAUNCH`,  are no longer necessary. It also exposes the functionality to user-mode, meaning a custom driver is not required. However, the virtual CPU must still be initialized appropriately via WHP prior to executing the target code. The important aspects will be described below.

### Control registers

Only the `CR0`, `CR3`, and `CR4` control registers are relevant for this project. `CR0` and `CR4` are used to enable CPU configuration options such as protected mode, paging, and PAE. `CR3` contains the physical address of the `PML4` paging table, which will be described in further detail in the Memory Paging section.

### Model-specific registers

Model-Specific Registers (MSRs) must also be initialized to ensure the correct operation of the virtual CPU. `MSR_EFER` contains flags for extended features, such as enabling long mode (64-bit) and `SYSCALL` instructions. `MSR_LSTAR` contains the address of the syscall handler, and `MSR_STAR` contains the segment selectors for transitioning to CPL0 (and back to CPL3) during syscalls. `MSR_KERNEL_GS_BASE` contains the shadow base address of the `GS` selector.

### Global descriptor table

The Global Descriptor Table (GDT) defines the segment descriptors, which essentially describe memory regions and their properties for use in protected mode.

In long mode, the GDT has limited use and is mostly a relic of the past - x64 always operates in a flat memory mode, meaning all selectors are based at `0`. The only exceptions to this are the `FS` and `GS` registers, which are used for thread-specific purposes. Even in those cases, their base addresses are not defined by the GDT. Instead, MSRs (such as `MSR_KERNEL_GS_BASE` described above) are used to store the base address.

Despite this obsolescence, the GDT is still an important part of the x64 model. For example, the current privilege level is defined by the `CS` (Code Segment) selector.

### Task state segment

In long mode, the Task State Segment (TSS) is simply used to load the stack pointer when transitioning from a lower privilege level to a higher one. As this emulator operates almost exclusively in CPL3, except for the initial bootloader and interrupt handlers, only a single page is allocated for the CPL0 stack. The TSS is stored as a special system entry within the GDT and occupies two slots.

### Interrupt descriptor table

The Interrupt Descriptor Table (IDT) contains information about each type of interrupt, such as the handler addresses. This will be described in further detail in the Interrupt Handling section.

### Bootloader

Most of the CPU fields mentioned above can be initialized using WHP wrapper functions, but support for certain fields (e.g. `XCR0`) only arrived in later versions of the WHP API (Windows 10 RS5). For completeness, the project includes a small “bootloader”, which runs at CPL0 upon startup and manually initializes the final parts of the CPU prior to executing the target code. Unlike a physical CPU, which would start in 16-bit real mode, the virtual CPU has already been initialized to run in long-mode (64-bit), making the boot process slightly more straightforward. 

The following steps are performed by the bootloader:

1. Load the GDT using the `LGDT` instruction. The source operand for this instruction specifies a 10-byte memory block which contains the base address and limit (size) of the table that was populated earlier.

2. Load the IDT using the `LIDT` instruction. The source operand for this instruction uses the same format as LGDT described above.

3. Set the TSS selector index into the task register using the `LTR` instruction. As mentioned above, the TSS descriptor exists as a special entry within the GDT (at `0x40` in this case).

4. The XCR0 register can be set using the `XSETBV` instruction. This is an additional control register which is used for optional features such as AVX. The native process executes XGETBV to get the host value, which is then copied into the guest via `XSETBV` in the bootloader. 
 
This is an important step because DLL dependencies that have already been loaded may have set global flags during their initialization process. For example, `ucrtbase.dll` checks if the CPU supports AVX via the `CPUID` instruction on startup and, if so, sets a global flag to allow the CRT to use AVX instructions for optimization reasons. If the virtual CPU attempts to execute these AVX instructions without explicitly enabling them in `XCR0` first, an undefined instruction exception will be raised.

5. Manually update `DS`, `ES`, and `GS` data segment selectors to their CPL3 equivalents (`0x2B`). Execute the `SWAPGS` instruction to load the TEB base address from `MSR_KERNEL_GS_BASE`.

6. Finally, use the `SYSRET` instruction to transition into CPL3. Prior to the `SYSRET` instruction, `RCX` is set to a placeholder address (CPL3 entry point), and `R11` is set to the initial CPL3 RFLAGS value (`0x202`). The `SYSRET` instruction automatically switches the `CS` and `SS` segment selectors to their CPL3 equivalents from `MSR_STAR`.  
 
When the `SYSRET` instruction executes, a page fault will be raised due to the invalid placeholder address in `RIP`. The emulator will catch this page fault and recognize it as a “special” address. The initial CPL3 register values will then be copied into the virtual CPU, `RIP` is updated to point to a custom user-mode loader function, and execution resumes. This function loads all DLL dependencies for the target executable, populates the IAT table, executes TLS callbacks, and then executes the original entry point. The import table and TLS callbacks are handled at this stage, rather than earlier on, to ensure their code is executed within the virtualized environment.

## Memory paging

All memory management for the guest must be handled manually. This means a paging table must be populated and maintained, allowing the virtual CPU to translate a virtual address to a physical address.

### Virtual address translation

For those who are not familiar with paging in x64, the paging table has four levels: `PML4`, `PDPT`, `PD`, and `PT`. For any given virtual address, the CPU walks through each layer of the table, eventually reaching the target physical address. Modern CPUs also support 5-level paging (in case the 256TB of addressable memory offered by 4-level paging isn't enough!), but this is irrelevant for the purposes of this project.

The following image illustrates the format of a sample virtual address:

![Breakdown of an example virtual address](/assets/images/winvisor-hypervisor-based-emulator/5WT-image.png "Breakdown of an example virtual address")

Using the example above, the CPU would calculate the physical page corresponding to the virtual address `0x7FFB7D030D10` via the following table entries: `PML4[0xFF]` -> `PDPT[0x1ED]` -> `PD[0x1E8]` -> `PT[0x30]`. Finally, the offset (`0xD10`) will be added to this physical page to calculate the exact address.

Bits `48` - `63` within a virtual address are unused in 4-level paging and are essentially sign-extended to match bit `47`.

The `CR3` control register contains the physical address of the base `PML4` table. When paging is enabled (mandatory in long-mode), all other addresses within the context of the CPU refer to virtual addresses.

### Page faults

When the guest attempts to access memory, the virtual CPU will raise a page fault exception if the requested page isn't already present in the paging table. This will trigger a VM Exit event and pass control back to the host. When this occurs, the `CR2` control register contains the requested virtual address, although the WHP API already provides this value within the VM Exit context data. The host can then map the requested page into memory (if possible) and resume execution or throw an error if the target address is invalid.

### Host/guest memory mirroring

As mentioned earlier, the emulator creates a child process, and all virtual memory within that process will be mapped directly into the guest using the same address layout. The Hypervisor Platform API allows us to map virtual memory from the host user-mode process directly into the physical memory of the guest. The paging table will then map virtual addresses to the corresponding physical pages.

Instead of mapping the entire address space of the process upfront, a fixed number of physical pages are allocated for the guest. The emulator contains a very basic memory manager, and pages are mapped "on demand." When a page fault occurs, the requested page will be paged in, and execution resumes. If all page "slots" are full, the oldest entry is swapped out to make room for the new one.

In addition to using a fixed number of currently mapped pages, the emulator also uses a fixed-size page table. The size of the page table is determined by calculating the maximum possible number of tables for the amount of mapped page entries. This model results in a simple and consistent physical memory layout but comes at the cost of efficiency. In fact, the paging tables take up more space than the actual page entries.

There is a single PML4 table, and in the worst-case scenario, each mapped page entry will reference unique PDPT/PD/PT tables. As each table is `4096` bytes, the total page table size can be calculated using the following formula:

```
PAGE_TABLE_SIZE = 4096 + (MAXIMUM_MAPPED_PAGES * 4096 * 3)
```

By default, the emulator allows for `256` pages to be mapped at any one time (`1024KB` in total). Using the formula above, we can calculate that this will require `3076KB` for the paging table, as illustrated below:

![Diagram illustrating the physical memory map within the virtualized guest](/assets/images/winvisor-hypervisor-based-emulator/8gv-image.png "Diagram illustrating the physical memory map within the virtualized guest")

In practice, many of the page table entries will be shared, and a lot of the space allocated for the paging tables will remain unused. However, as this emulator functions well even with a small number of pages, this level of overhead is not a major concern.

The CPU maintains a hardware-level cache for the paging table known as the Translation Lookaside Buffer (TLB). When translating a virtual address to a physical address, the CPU will first check the TLB. If a matching entry is not found in the cache (known as a “TLB miss”), the paging tables will be read instead. For this reason, it is important to flush the TLB cache whenever the paging tables have been rebuilt to prevent it from falling out of sync. The simplest way to flush the entire TLB is to reset the `CR3` register value.

## Syscall handling

As the target program executes, any system calls that occur within the guest must be handled by the host. This emulator handles both `SYSCALL` instructions and legacy (interrupt-based) syscalls. `SYSENTER` is not used in long-mode and, therefore, is not supported by WinVisor.

### Fast syscall (SYSCALL)

When a `SYSCALL` instruction executes, the CPU transitions to CPL0 and loads `RIP` from `MSR_LSTAR`. In the Windows kernel, this would point to `KiSystemCall64`. `SYSCALL` instructions won't inherently trigger a VM Exit event, but the emulator sets `MSR_LSTAR` to a reserved placeholder address — `0xFFFF800000000000` in this case. When a `SYSCALL` instruction is executed, a page fault will be raised when RIP is set to this address, and the call can be intercepted. This placeholder is a kernel address in Windows and won't cause any conflicts with the user-mode address space.

Unlike legacy syscalls, the `SYSCALL` instruction doesn't swap the `RSP` value during the transition to CPL0, so the user-mode stack pointer can be retrieved directly from `RSP`.

### Legacy syscalls (INT 2E)

Legacy interrupt-based syscalls are slower and have more overhead than the `SYSCALL` instruction, but despite this, they are still supported by Windows. As the emulator already contains a framework for handling interrupts, adding support for legacy syscalls is very simple. When a legacy syscall interrupt is caught, it can be forwarded to the “common” syscall handler after some minor translations — specifically, retrieving the stored user-mode `RSP` value from the CPL0 stack.

### Syscall forwarding

After the emulator creates the "main thread" whose context gets cloned into the virtual CPU, this native thread is reused as a proxy to forward syscalls to the host. Reusing the same thread maintains consistency for the TEB and any kernel state between the guest and the host. Win32k, in particular, relies on many thread-specific states, which should be reflected in the emulator.

When a syscall occurs, either by a `SYSCALL` instruction or a legacy interrupt, the emulator intercepts it and transfers it to a universal handler function. The syscall number is stored in the `RAX` register, and the first four parameter values are stored in `R10`, `RDX`, `R8`, and `R9`, respectively. `R10` is used for the first parameter instead of the usual `RCX` register because the `SYSCALL` instruction overwrites `RCX` with the return address. The legacy syscall handler in Windows (`KiSystemService`) also uses `R10` for compatibility, so it doesn’t need to be handled differently in the emulator. The remaining parameters are retrieved from the stack.

We don’t know the exact number of parameters expected for any given syscall number, but luckily, this doesn’t matter. We can simply use a fixed amount, and as long as the number of supplied parameters is greater than or equal to the actual number, the syscall will function correctly. A simple assembly stub will be dynamically created, populating all of the parameters, executing the target syscall, and returning cleanly.

Testing showed that the maximum number of parameters currently used by Windows syscalls is `17` (`NtAccessCheckByTypeResultListAndAuditAlarmByHandle`, `NtCreateTokenEx`, and `NtUserCreateWindowEx`). WinVisor uses `32` as the maximum number of parameters to allow for potential future expansion.

After executing the syscall on the host, the return value is copied to `RAX` in the guest. `RIP` is then transferred to a `SYSRET` instruction (or `IRETQ` for legacy syscalls) before resuming the virtual CPU for a seamless transition back to user-mode.

### Syscall logging

By default, the emulator simply forwards guest syscalls to the host and logs them to the console. However, some additional steps are necessary to convert the raw syscalls into a readable format.

The first step is to convert the syscall number to a name. Syscall numbers are made up of multiple parts: bits `12` - `13` contain the system service table index (`0` for `ntoskrnl`, `1` for `win32k`), and bits `0` - `11` contain the syscall index within the table. This information allows us to perform a reverse-lookup within the corresponding user-mode module (`ntdll` / `win32u`) to resolve the original syscall name.

The next step is to determine the number of parameter values to display for each syscall. As mentioned above, the emulator passes `32` parameter values to each syscall, even if most of them are not used. However, logging all `32` values for each syscall wouldn't be ideal for readability reasons. For example, a simple `NtClose(0x100)` call would be printed as `NtClose(0x100, xxx, xxx, xxx, xxx, xxx, xxx, xxx, xxx, ...)`. As mentioned earlier, there is no simple way to automatically determine the exact number of parameters for each syscall, but there is a trick that we can use to estimate it with high accuracy.

This trick relies on the 32-bit system libraries used by WoW64. These libraries use the stdcall calling convention, which means the caller pushes all parameters onto the stack, and they are cleaned internally by the callee before returning. In contrast, native x64 code places the first 4 parameters into registers, and the caller is responsible for managing the stack.

For example, the `NtClose` function in the WoW64 version of `ntdll.dll` ends with the `RET 4` instruction. This pops an additional 4-bytes off the stack after the return address, which implies that the function takes one parameter. If the function used `RET 8`, this would suggest that it takes 2 parameters, and so on.

Even though the emulator runs as a 64-bit process, we can still load the 32-bit copies of `ntdll.dll` and `win32u.dll` into memory - either manually or mapped using `SEC_IMAGE`. A custom version of `GetProcAddress` must be written to resolve the WoW64 export addresses, but this is a trivial task. From here, we can automatically find the corresponding WoW64 export for each syscall, scan for the `RET` instruction to calculate the number of parameters, and store the value in a lookup table.

This method is not perfect, and there are a number of ways that this could fail:

* A small number of native syscalls don't exist in WoW64, such as `NtUserSetWindowLongPtr`.
* If a 32-bit function contains a 64-bit parameter, it will be split into 2x 32-bit parameters internally, whereas the corresponding 64-bit function would only require a single parameter for the same value.
* The WoW64 syscall stub functions within Windows could change in such a way that causes the existing `RET` instruction search to fail.

Despite these pitfalls, the results will be accurate for the vast majority of syscalls without having to rely on hardcoded values. In addition, these values are only used for logging purposes and won't affect anything else, so minor inaccuracies are acceptable in this context. If a failure is detected, it will revert back to displaying the maximum number of parameter values.

### Syscall hooking

If this project were being used for sandboxing purposes, blindly forwarding all syscalls to the host would be undesirable for obvious reasons. The emulator contains a framework that allows specific syscalls to be easily hooked if necessary.

By default, only `NtTerminateThread` and `NtTerminateProcess` are hooked to catch the guest process exiting.

## Interrupt handling

Interrupts are defined by the IDT, which is populated before the virtual CPU execution begins. When an interrupt occurs, the current CPU state is pushed onto the CPL0 stack (`SS`, `RSP`, `RFLAGS`, `CS`, `RIP`), and `RIP` is set to the target handler function.

As with `MSR_LSTAR` for the SYSCALL handler, the emulator populates all interrupt handler addresses with placeholder values (`0xFFFFA00000000000` - `0xFFFFA000000000FF`). When an interrupt occurs, a page fault will occur within this range, which we can catch. The interrupt index can be extracted from the lowest 8-bits of the target address (e.g., `0xFFFFA00000000003` is `INT 3`), and the host can handle it as necessary.

At present, the emulator only handles `INT 1` (single-step), `INT 3` (breakpoint), and `INT 2E` (legacy syscall). If any other interrupt is caught, the emulator will exit with an error.

When an interrupt has been handled, `RIP` is transferred to an `IRETQ` instruction, which returns to user-mode cleanly. Some types of interrupts push an additional "error code" value onto the stack - if this is the case, it must be popped prior to the `IRETQ` instruction to avoid stack corruption. The interrupt handler framework within this emulator contains an optional flag to handle this transparently.

## Hypervisor shared page bug

Windows 10 introduced a new type of shared page which is located close to `KUSER_SHARED_DATA`. This page is used by timing-related functions such as `RtlQueryPerformanceCounter` and `RtlGetMultiTimePrecise`.

The exact address of this page can be retrieved with `NtQuerySystemInformation`, using the `SystemHypervisorSharedPageInformation` information class. The `LdrpInitializeProcess` function stores the address of this page in a global variable (`RtlpHypervisorSharedUserVa`) during process startup.

The WHP API seems to contain a bug that causes the `WHvRunVirtualProcessor` function to get stuck in an infinite loop if this shared page is mapped into the guest and the virtual CPU attempts to read from it.

Time constraints limited the ability to fully investigate this; however, a simple workaround was implemented. The emulator patches the `NtQuerySystemInformation` function within the target process and forces it to return `STATUS_INVALID_INFO_CLASS` for `SystemHypervisorSharedPageInformation` requests. This causes the `ntdll` code to fall back to traditional methods.

## Demos

Some examples of common Windows executables being emulated under this virtualized environment below:

![ping.exe being emulated by WinVisor](/assets/images/winvisor-hypervisor-based-emulator/Slj_Image_3.png "ping.exe being emulated by WinVisor")

![cmd.exe being emulated by WinVisor](/assets/images/winvisor-hypervisor-based-emulator/gs2_Image_4.png "cmd.exe being emulated by WinVisor")

![notepad.exe being emulated by WinVisor, including a hooked syscall (NtUserCreateWindowEx) for demonstration purposes](/assets/images/winvisor-hypervisor-based-emulator/zkL_Image_5.png "notepad.exe being emulated by WinVisor, including a hooked syscall (NtUserCreateWindowEx) for demonstration purposes")

## Limitations

The emulator has several limitations that make it unsafe to use as a secure sandbox in its current form. 

### Safety issues

There are several ways to "escape" the VM, such as simply creating a new process/thread, scheduling asynchronous procedure calls (APCs), etc.

Windows GUI-related syscalls can also make nested calls directly back into user-mode from the kernel, which would currently bypass the hypervisor layer. For this reason, GUI executables such as notepad.exe are only partially virtualized when run under WinVisor.

To demonstrate this, WinVisor includes an `-nx` command-line switch to the emulator. This forces the entire target EXE image to be marked as non-executable in memory prior to starting the virtual CPU, causing the process to crash if the host process attempts to execute any of the code natively. However, this is still unsafe to rely on — the target application could make the region executable again or simply allocate executable memory elsewhere.

As the WinVisor DLL is injected into the target process, it exists within the same virtual address space as the target executable. This means the code running under the virtual CPU is able to directly access the memory within the host hypervisor module, which could potentially corrupt it. 

### Non-executable guest memory

While the virtual CPU is set up to support NX, all memory regions are currently mirrored into the guest with full RWX access.

### Single-thread only

The emulator currently only supports virtualizing a single thread. If the target executable creates additional threads, they will be executed natively. To support multiple threads, a pseudo-scheduler could be developed to handle this in the future.

The Windows parallel loader is disabled to ensure all module dependencies are loaded by a single thread.

### Software exceptions

Virtualized software exceptions are not currently supported. If an exception occurs, the system will call the `KiUserExceptionDispatcher` function natively as usual.

## Conclusion

As seen above, the emulator performs well with a wide range of executables in its current form. While it is currently effective for logging syscalls and interrupts, a lot of further work would be required to make it safe to use for malware analysis purposes. Despite this, the project provides an effective framework for future development.

## Project links

[https://github.com/x86matthew/WinVisor](https://github.com/x86matthew/WinVisor)

The author can be found on X at [@x86matthew](https://x.com/x86matthew).
