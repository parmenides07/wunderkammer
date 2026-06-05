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