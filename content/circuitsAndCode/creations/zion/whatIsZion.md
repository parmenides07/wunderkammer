banner: assets/zion1.jpg

This is meant to serve as the singular Zion introductory document. 

I'll start with some context, I've always felt that other notetaking apps were too limiting like Obsidian or notion or Emacs Org mode. What I'd constantly come back to was just using paper and drawing these very abstract relationships between information. Having that spatial freedom really helped with refining ideas and ideating but one thing I missed was the digital ability to query for information. This is where zion began: as a spatial notetaking software. However, as I continued development, I noticed another flaw of many note taking apps. Most text editors would have a heading (the parent) and then children but these children can only have that one parent. I found this icnredibly limiting and forced me into this linear way of storing information. So this brought me to where the development of zion is heading now.

Essentially, what if you could combine the spatial freedom of paper with the human brain-like knowledge webs of apps like Obsidian with the structured approach of hierarchical notetaking. Dare I say, also make these aspects better by allowing for the manipulation and modification in a space, making the knowledge webs appear more naturally, and constraining the hiearchies by only how you think not by any inherent rules.

### AI Summarized Version (I Yapped Too Much)

**Zion** is a spatial, relational notetaking app built around a fundamentally different way of storing information. Instead of documents with headings and bullet points, everything in Zion is a package -- a self-contained unit of information that can be anything from a single word to entire paragraphs.

**The core model:** Packages don't live inside documents. They exist independently and form explicit relationships with each other. There are three relationship types: parent, child, and spousal. Parent/child is familiar from hierarchical notetaking, but with a crucial difference -- a package can have unlimited parents and unlimited children simultaneously. Spousal relationships bind two packages together as equivalents, neither containing the other. The viewport and everything the user interacts with is just a visualization formed at runtime based off of this raw data.

![zionexample](assets/zionexample.png)

**Why this is different:** In traditional notetaking, "German Shepherd" lives under "Dogs" and nowhere else. In Zion, "German Shepherd" can simultaneously be a child of "Dogs," "Breeds," and "Cute Animals" -- because that's genuinely true. The diagram illustrates this: the same packages appear in multiple contexts, not as copies or links, but as the same object viewed from different relational angles. 

**Emergent relationships:** From just three primitives, a rich family tree emerges automatically. Two packages that share a parent become siblings. A parent's sibling becomes an aunt or uncle. These are never manually declared -- they're computed on demand from the underlying graph. The system also intentionally allows paradoxes: Animals contains Cute while Cute contains Animals. This isn't a bug, it reflects how human knowledge actually works. This is a great example of [emergent complexity](https://parmenides07.github.io/wunderkammer/#theMindfill/03-21-26_EmergentComplexityAndControl.md).

**The real power is querying.** Rather than searching for tagged strings, you traverse the relationship graph. The example given: "find nephews of German Shepherd whose grandparent is Dogs" -- this returns children of other dog breeds, surfacing perhaps a story about when I got attacked by a Pomeranian without ever having explicitly tagged or linked it. You're querying the structure of your knowledge, not just its text content.

**The vision:** A second brain that builds itself. As you naturally write and connect ideas, Zion constructs a dense queryable knowledge graph without requiring you to maintain tagging systems, manually create links, or organize files. The relationships form through use, and over time the database becomes a powerful reflection of how you actually think.

Some may see this as pointless and unneccesary but the best way to view it is a robust storaage system for information and data in a notetaking context that facilitates the querying of this data through [emergent](https://parmenides07.github.io/wunderkammer/#theMindfill/theMindfill.md) relationships. I know this would be perfect for the way I think and structure information so I'm sure there are others like me. Be that as it may, I'm still reall excited about this project and the potetnial it has even if no one will ever use it lol. 
