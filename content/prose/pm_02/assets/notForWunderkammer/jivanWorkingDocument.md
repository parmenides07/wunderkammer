# Phases
1. Backend
	1. Get graph working with text
2. Depict Relationships Textually
	1. Simple layout trees in text
3. Visual Prototype in HTML/CSS/JS
	1. Simple browser prototype with splitting and placing
4. Visual Enhancement and Shoma/Workspace
	1. PIxiJS 
5. Persistence
	1. SQL and MD Files
	2. Note that the whole program is an MD editor and each cell is just text to edit. 
		1. You are editing only whichever cell you have clicked on
6. Query Engine 
7. Themes and Animations
	1. TONS OF WRITING 

# Phase 1: Backend
Cell Struct
- Content
- ID

Relationship Struct
- ID of Cell A
- ID of Cell B
- Relationship Type
	- Enum (Spouse, Parent, Child)
- Relationship ID

## Relationship Setup
**Model**
1. Each cell holds version
	1. This can get messy because we need to constantly sync both if one changes
2. Global relationship list hashmap based on relationshipID. But also a helper functions that give an array of Parent CellIDs from Child Cell ID. Same for parent and spouse. Those 3 are hashmaps btw.

## ID Setup
**Model:**
1. Simple Integer IDs
	1. 1, 2, 3, 4, 5...
	2. It simply assigns ID by incrementing number.
	3. Quick but messy because you have to store the next number and also merging files and messing with stuff in the backend can lead to two cells having the same id.
2. Random ID
	1. cell_q213hf8
	2. This is short not super verbose but also small chance for collision
3. UUID String
	1. 550e8400-e29b-41d4-a716-446655440000
	2. Very verbose and unreadable but little to no chance for collision

**Usage**
1. We need a quick way to get the address of a cell from the ID. Instead of having a flat array of all the cells that you search through for a ID match, you can have a hashmap where you search with the ID and get a cell.

# Notes
1. Type essentially sets whatever it can be if you do type cellID = string. Then whenver you use cellID like let id: cellID ="abc" it must be a string. Similarly, you can do type cellID = 1234 and it must be 1234 when you do id: cellID = 1234. And also, you can do type cellID = 12 | 34 | 56 so when you use cellID it can only be one of those.
	1. Branded types are a step further its like assigning the value with that type so it becomes something of its own variable type not just a string in a costume. 
	2. Brand works kind of like a bfunction like brand is aribitary you have just made a function that returns an outptu. 

2. State is the thing that contains all the memroy of the file so by doing state.variable you can get the value of that vairbale very easily on a global level. Omg its a user defined thing you just make something called state so it can be a backapack full of all our variables we want to use. Its like a root container we ahve chosen a b ackpack full of materials and tools (variables esentially) that are contained within that backpack so we can have multiple backpacks that we can pick up and use stuff from. using things individually gets messy 
# Phase 2: Shoma
- Intermediary model between data nad rendering. How to store layout of Shoma.
	- Tree layout
- Three types of visual categories in a shoma
	1. Placed
		1. Related to NOTHING not even central cell has no bearing or visual representation of anything with any cell
	2. Positioned 
		1. Only related to central cell its position has no bearing or visual reprensetaion of anything with other cells
	3. Structural Split
		1. Related to everything its position is visually indiciative of relationships with all the cells inside of the shoma

curerntly for splitting we wlak from root till we find focused id but alter lets do a hashmap tracking position so its quicker and we arent searching many arrays of children


- Later on make it so boundaries arent something invisible and engative margins but instead the cells dont have borders and the boundary makes up the boudnary amongst things.


- Okay so later on it needs to become visually clear wheter something is positioned or placed or srtuctural. If we have cell a and to right cell b and to right cell c we dont know if cell c is spouse of cell b as well as cell a. 
	- I think defualt view should be clean tiled shoma with minimal borders and color strips representing their label 
	- BUT when you hover or focus a cell, it will highlight parents, children and spouse and slightly dim unrelated cells. 
- **IMPLIMENT FOLDING LATER TOO like within splits but also Fold a rectangular region of the Shoma by collapsing the space between two parallel boundaries.**
	- **folding v1 same split range folding**
	- **folding v2 geometric full span region folding** 
gotta add mouse controls to make it feel inutiive later too
- Later on have autofill content cell matching

When are we going to impliment folding of cells, resizing with mouse, and long form prose writing (bullet points and all) essentially markdown files.


1. Cell content folding
	1. **folding v1 same split range folding**
	- **folding v2 geometric full span region folding** 
2. One more autosave/import/export sanity pass
3. Clean up the theme and visual quirks 
	1. Maybe add blinking cursor 
	2. Every cell has a drop shadow very subtle but when you highlight the drop shadow becomes very noticeable looks almost like that cell has risen up.

june 9th:
Okay more stuff happened than even conceievable and lots and lots of features and technical changes (for the better).
However it got to a point where the tehcnical usage felt great and within cells felt pretty nice too just there were some bugs yes and some performance but more than that it didnt feel reliable and just didnt feel that anchoreed or grounded and i think that is because ofhte canvas

this grounded feeling i feel the most from a notepad or emacs and a little bit less with obsidian but its still there but with this i really didn't

it needs to be raw grounded anchored but also accurate and reliable 

make these first few versions without any drop shadows or pretty rendering

i really like dense space and informationa dn immediate feedback and response just simplciity in teh visuals. 
It needs to be something safe. my everything program. reliable and simple but powerful and accurate

1. groundedness canvasses Ive always disliked for feeling not anchored in teh case of akashom the canvas was the raltionships and space but it seperated away hte heart of any notetaking app: teh content we need to anchor the content by having a deliberate text editor on the right side just a 2nd flat thing 
2. reliability and data permanence feeling with obsidian things are autosaved and so saving feels little bit off with emacs it feels a bit more delibarate but still off its definately about the permanecen of data which the canvases can also hurt
3. performance i dislike notion for being cluncky and buggy and slow and that hurts my usage of it 
4. theme honestly i dont like the layered dimensional blurred rounded drop shadow effect i want it to be flat and tgrustable and usable like emacs or even obsidian 

all the possible types of cells in a shoma 
annotated positioned placed structural associated central
1 central 
	core
1 both cnetral and others
	orbital 
1 neither central and others
	oriented
1 just central
	bound
1 just others
	drifting 
1 not even a cell really
	????

so teh visual by default will be accurate and the layout by default accurate but the user can change it and it becomes not so acccurate layout wise but its terminology is still accurate 

once selection is implimented have it that everything you select you can set a relationship with teh focused. so you could have one focused an dselect anothoer nad mke it spouse child parent whatever and this would obviosuly update the tpye of cell they are
in tranient message and internally it should be aclled marriage adoption and birth

shift q should make a bar fill up and then when it gets to the end it does the query it feels kinda nice idk and it should be a dotted bar

also the focusec cell maybe have a little triangle in the top right corner so it looks like a little page sdimple triangle just same color as border so it sits flush

**some kind of akasha graph or birds eye view of everything**
**i want something high level but also abstract because thats what i think is missing i think we nailed the mid level shoma (space) and the low level (content) but now we need something high level (relationships) what do you think**
- It should be a like a constellation minimap that sits in the top righ tof the canvas like a compass
- family tree type like see great grandather but also 2nd nephew etc 
	- Maybe this is a seprate layer on top of the graph compass

**just an optional idea very high level feature: what if while in a shoma you can declare a new axis just for runtime just for sake of creating relationships rather than the core being the core you just aritfiically temporarily make something else the core so this way you could be off somewhere else in a shoma and be setting relationships with that other thing, yes its abstracted a bit from the core which should be the core of the shoma but idk i think itsvery powerful and helpfuil**

**relationship compass**, not a full graph.

fundamentally the content is covered by the right pane, the relationships are coveredby the minimap akasha and the shoma middle canvas is the middle layer and bridges together relationships and content with space.
- On a conceptual level, we've innovated in terms of relationships (linking to 3 relationship types and emergence) and same with space (reaching a middleground between grid/linear and free space) but **how are we innovating with content?** I'd say vim binds are innovation in content but how is that me bringing anything to the table. The akasha will come in v1.5, and the content innovation in v2.0
	- What brings all this together is reliability (of data), performance, and visuals. The top bottom and middle layer automatically achieve both worms eye, humans eye, and birds eye view giving ultimate feeling (grounded yet aware etc) 

Your mental model sounds right:

```
             parents                ↑spouses ← focused cell → spouses                ↓             children
```

Then each visible related Cell also shows its own immediate parents / children / spouses, but only one more layer. So the minimap becomes:

```
center Cell  direct family/relationship ring    second-order relationship echoes
```

That is feasible, understandable, and useful.

The important constraint is:

```
Never show the whole Akasha by default.Show the current relationship field.
```

So even if the Akasha has 10,000 Cells, the constellation might show:

```
1 focused Cell5–15 direct relationships20–60 second-order relationshipsextra lines only between already-visible nodes
```

That is fine.

## Lines are okay, but they should not feel like Obsidian

Drawing lines is not automatically copying Obsidian. Lines are just the natural visual language for relationships.

What would make it feel like Obsidian is:

```
random force-directed hairballsame node style for every notesame edge style for every linkglobal graph as the main visual identity
```

What would make Akashom different is:

```
parents live abovechildren live belowspouses live sidewaysShoma/core context is shown as a soft field/cloudlinks/transclusions/proxies have different line stylescurrent Cell is treated like the gravitational centerthe graph is ambient and local, not global by default
```

So instead of an Obsidian graph, it becomes a **semantic compass**.

## I would avoid pure force-directed layout

Force layout looks cool but often destroys meaning. For Akashom, relationship direction matters.

I would use a deterministic layout:

```
parents: upper arc / top bandchildren: lower arc / bottom bandspouses: left/right orbittext links: faint diagonal/satellite edgestransclusions: thicker containment-like edgeproxy targets: small hollow node or ghost edge
```

Then for second-order nodes, place them just beyond their first-order owner, still respecting direction.

Example:

```
        parent of parent       parent                \              /                  [ Parent ]                      |[Spouse] —— [ Focused Cell ] —— [Spouse]                      |                  [ Child ]                /          \        child’s child     child’s spouse
```

That has graph lines, but it is not Obsidian. It is Akashom’s relationship grammar.