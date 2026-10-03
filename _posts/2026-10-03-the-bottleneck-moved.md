---
layout: post
title: "The bottleneck moved: the effect of agent-assisted software engineering in the pharma industry"
author: "Đorđe Relić"
tags: [software development, pharma, biotech, ai, opinion]
---

As in all industries, software development in the pharma/biotech industry is changing rapidly and irreversibly. As someone whose core work is focused on designing and developing software in this industry, I've been observing how my work has changed, but also how it is yet to change. In this, I'll offer a combination of indisputable facts but also my opinions on what are the current problems and what would be necessary to change them.

The piece will be split in three main sections and it's going to start with something that's quite familiar: the need for and ways to harness all the data present in the pharma industry as well as how silos, which make these problems harder, are formed and reinforced through software solutions. The second section will take that starting premise and focus on what agent-driven development has done for silos so far and what it can do next. And lastly, what I see as a good direction to move to when it comes to software solutions specialized for the pharma industry.

## Silos and data access 

Silos[^1] in large companies are artificial concepts that describe a real problem - departments that behave like they live in walled gardens, do not interact and, more importantly, don't share data with other departments. Technically, existence of one such department or group is already sufficient for an existence of a silo (department that's the silo and everyone else) but it's much more often that there are multiple such silos. And, the larger the corporation, the higher likelihood for such silos to exist.

Normally, silos are not created on purpose. The evolution of a silo starts from the most banal reason and that is that a department is hyper focused on the problem they're solving. In particular when it comes to research groups - the objective of a given group is very clear and can roughly be split into two groups: 1) **target discovery and validation** which includes understanding the disease biology to identify and validate potential targets or 2) **lead identification and lead optimization** which involves identifying molecules that modulate those targets and progressively optimizing them for potency, selectivity, safety, pharmacokinetics, and other properties required for further development. With these two goals in mind, a research group truly nearly never thinks about different ways to improve on or develop cross-departmental collaboration. There's just no incentive for that, but also, more importantly, there's no time for that when the urgency is there to help the patients.

While "one size **doesn't** fit all" is mostly true in general, when it comes to software in the pharma industry, it's especially true. That is why software that is developed by large centralized departments (such as IT departments) is very hard to develop and deploy quickly simply because there are a lot of stakeholders' requirements to fit in. Additionally, that variety of requirements is also often either highly specific, insufficiently described, volatile in nature (the need changes quickly, but only after trying the solution), countering what was previously developed or what other stakeholders are asking for, and always - very urgent. 

This is the reason for the emergence of the so-called *shadow IT* [^2]. But unlike in the show, the shadow IT in the pharma industry is the group that truly most directly enables the bench scientists, for better or worse. Shadow IT usually starts from one dedicated hire in a small team or a current member that's tech savvy enough that they start developing some small bespoke software solutions, catered completely to the needs of the lab scientists. These solutions are made quickly, ignoring most of the software development best practices, iterated over new features very fast and optimizing for keeping the scientists happy and empowered through software.

Even though this sounds great, as time passes, there's more and more specialized software in that department, and more and more lab scientists that are getting used to this software until it becomes a *de facto* mandatory and necessary part of the scientists' workflow. But in reality, this bespoke departmental software **reinforces the existing silo** and, to make things even more fun, if not from beginning then definitely soon, it will **have its twin sibling developed in some other department**. With this, what we're ending up with is a plethora of software being used in different departments, that doesn't have a proper software development life-cycle (SDLC [^3]) implemented, is barely maintained but too critical to get rid of. 

This software is also a solution for storing and serving experimental data. The *data* and especially, the *large scale access to all the data* is every data engineer's/scientist's wet dream, and even more so, not having that large scale access is preventing us from unlocking so many insights and cutting down the time spent in the drug discovery process.

**But**, custom software, developed by shadow IT only solves the problems of today and the ones that will come tomorrow. There's no time, or need, to solve access to all the data in the company. In fact, I'd argue that this is a good approach to think about the problem, but elaborating more on this will have to happen in another post.

## Agent-driven development in the pharma industry

As you can guess from the previous section, agent-driven development empowers the shadow IT the most. Developing software became [^4] so cheap, that developing internal custom solutions is a no-brainer. Said solutions not only work better, but even look nicer. Iterating over different ideas and testing what works and what doesn't goes even faster, which in turn empowers the scientists even more.

*It is* also producing more unmaintainable [^5] code lying around, but also, because it's so easy and cheap, developers don't have the time to **fall in love with their super cool awesome solution**. 

This romantic relationship between a developer and their software was helping tremendously with reinforcing the silos. Simply because, with development being slow, but also being very helpful, I have a long time to see how cool and useful my software is, and each new feature is another verse of the love song that I write to that software. And if there's a risk that some other solution is coming to replace the one I wrote, and even more if it's not truly covering for the specific needs of the group I'm working with, of course I'm going to be very reluctant with being on board for this change. This is true in *all* software development, but in pharma, it's especially important since the software is so custom and special.

Agent-driven development is preventing me from falling in love with my solution **and** it's allowing for earlier sanity-checks of how much I'm in love with my **idea of the solution**. Quick turnaround in software development tests ideas much faster and shows whether the solution is useful or not. And since it was quick and cheap to make, it's no biggie to trash it quickly too.

Faster and easier software development also gives more voice to all kinds of ideas that were previously just as ideas and not as implementation. Simply because it would've taken too much time to develop them and the benefit wasn't clear enough (or at least the decision makers weren't convinced enough). Now, I can just try it by giving instructions to Claude during my coffee break, while still getting done the tasks that actually earn my paycheck.

And this - generation of proof-of-concept prototypes for wild ideas - is **narrowing down what's the bottleneck: going through all the hoops to deploy software globally in a large company and integrate with existing systems**. While developing software was slow(er), there was no real issue with having the process of getting the right permissions, certificates and clearances in order before your software is live. On the integration front, it was also not really visible how much time it took to get those other systems ready for read/write actions (whether through implementation of API layers or through scaling them up). This was also helped with the fact that if time was being invested in creating some custom software, there was also support and endorsement from the manager layers that would help push these needs to other interested parties, and get things done faster.

Now that software development time is shortened, and can be done in spare time, these issues become an obvious problem. Therefore, it is my opinion that:
- Processes need to improve if we were to increase the ways in which we benefit from agent-driven software development.
- Global systems, that are required to be used across the whole organization, such as data lakes, registration systems, experimental description and readout databases, need to be readily scalable for high throughput integrations

## Current moats and prediction for next steps in software development in pharma

This brings us to the question of globally deployed software that, even though it doesn't have the size that fits all, it is mandated to be used by all employees that are working with specific data. An example of such software are electronic lab notebooks that store experiment protocol details, compound registration systems that store information about designed drugs, or specialized data stores that store imaging, omics, or any other kind of specialized experimental readout data. The software landscape of such solutions is vast, and there are big players with large contracts that offer solutions for these kinds of problems. And, as expected, each of them is now offering different flavors of AI solutions that will empower the scientists using these tools.

However, like in many other industries, it is highly likely that these solutions either depend on leveraging access to frontier labs' models *or* use some locally run models that are inferior to the frontier models.

Additionally, the user-facing interface of choice seems to be the chat interface [^6]. Primarily because it allows the user to use free language to express simple and complex requests and let the app, or rather the agent, figure out what the user really meant with the words they used. 

Building a chat interface that would leverage a frontier model in the background, or any other, locally or remotely hosted, model for that matter, is not hard. What's hard is to set up the right guardrails and enforce structure in the way that:
- Data is ingested from users in the format of a *brain dump*, accompanied by images, PDFs, Excel and .tsv sheets and stored in the correct structure that can be used downstream
- And serve the data-supported insights to the user, based on the sparsely provided prompt question.

That said, the moat is with the team that's best positioned to cover the needs of the users. The best positioned team is the one closest to the user, which innovates fast and iterates at a quick pace converging to the best prototype of a solution that later gets picked up and developed into a professional solution.

The more data the agent has at its disposal, the better the answers will be. The best case scenario being that the agent has integrations with *all* the specialized systems in the company, and gets to provide most informed answers.

Allowing vendor AIs to tap into any other system than the one they're providing will require a lot of trust and even more work to ensure that the vendors’ AI won't do something it's not supposed to.

Finally, since we now know that writing chat-based apps (*the interface*) is cheap and quick, as long as we have access to **an** agent (*the brain*) that can tap into the systems that support high-throughput I/O (*the structure*), we're going to have an easy time making new and improved interfaces and testing them with new, improved, or completely private and local, sovereign if you will, agents that run on our network or are accessible via API and are run by the frontier labs.

___

In summary, like everywhere, agent-driven development is bringing changes to software development in the pharma industry. It's bringing changes in the way software is developed and since one problem is not a problem anymore, the real list of bottlenecks is being narrowed down. How well we deal with those bottlenecks will determine the real velocity of change and improvement, when it comes to software development in the pharma industry.

The best teams will be the ones that will leverage the new speed of software development to iterate fast over prototypes and innovative ideas and converge to the best product, that will probably be much more customized. But unlike before, the real customization will be only in the guardrails and pre-prompt engineering of the chat-based interface. 

The rest of the system, the platforms and applications that are globally used across the company are not going anywhere, but they will have to keep up with I/O demand. The success of scaling up this demand will determine how much the agents *can* be leveraged and how much they can speed up the drug discovery process.

With building the right structure in terms of connecting and integrating large systems that store data, and the right frameworks that push and further develop the most useful prototypes, the agents, that are *the brain* of it all, become very interchangeable and in case of high bills, running a strong local model will enable continuity of maximally using internal data, but additionally come with privacy and full control.

## References

[^1]: Although, I’d love to be talking about this [Silo](https://en.wikipedia.org/wiki/Silo_(TV_series)): I’m in fact talking about an [Information Silo](https://en.wikipedia.org/wiki/Information_silo). But I def recommend the TV show Silo!
[^2]: I promise this is not _another_ way to get you to watch the show, and I’m not making up these names. It’s a very well accepted name: [Shadow IT](https://en.wikipedia.org/wiki/Shadow_IT)
[^3]: [Software development life cycle](https://en.wikipedia.org/w/index.php?title=Software_development_life_cycle&redirect=no "Software development life cycle")
[^4]: With the cost still going down. For now.
[^5]: Not because it's not possible but because it's not a priority and it's not fun. Technical debt is almost as acceptable as government debt.
[^6]: For now. It kind of looks like there’s a good chance it turns into voice before it gets to the brain implant. In some (potentially not too distant) future.
