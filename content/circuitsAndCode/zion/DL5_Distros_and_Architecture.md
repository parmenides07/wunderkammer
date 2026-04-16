banner: assets/blue1.jpg

## Architecture Change
- So previously, I was super excited about this whole visualization of the relationships. The left side of the screen would be the workspace — all the recursive stuff with a package and its child and its child and its child being displayed. The issue with this is it quickly becomes very bloated. You'd be writing in a package and you'd see tons of other things that you don't currently care for. On top of that, having the recursive visuals would be a bit of a nightmare to implement in a way that does not slow down performance.

### So What's the New Solution?

- Really the same as before. One side is the workspace, the other is data. But now, this is truly what it is. When you open the left side it is essentially a scratchpad — you write a new package, if it already exists it's automatically populated. You don't see all of its children within it this time though. You just instantiate whatever information you want into a package and keep writing. By default, all that is displayed is what you've written in that session. This lets the user purely focus on the addition and arrangement of new information.

- Notice how I said by default? Same principle as the automatic population — if you write a package that already exists it will just populate. This also works to let you display whatever children you actually want displayed at that time.

- But you may be asking two things. How do I know what children are in that package? And — I wanted to know of the relationships so they could influence what I write, why should those be removed?

### Both Answered
- In the previous version, the workspace and the data were redundant — both committed to displaying the relationships. But here we still have the data view, we've just truly condensed the workspace to being just that, a workspace. That is where you create new packages and arrange them. The data side is still there, that is where all the relationships will be displayed and where you can query things to further hone what is shown. Spatial location of packages respective to their parent or children is only relevant to the workspace side. Data view doesn't even use that.

- This change is definitely for the better. Makes the program much easier to write, use, and get output with.

## Distros and Flavors
- I've always been very interested in giving the user choice and allowing them to choose what best suits their needs — because after all, to get the highest output out of something, ideally you must control it in its entirety.

### The Apple vs Linux Problem
- This is something Apple as a company fails in. By lowering the skill floor so much, they also make it much harder to do anything non-standard with it whether that be hardware or software. Linux, mainly talking Arch here, is almost the opposite — utmost control without any abstraction or guardrails, full freedom to shoot yourself in the foot. Forces only a certain type of person to use it.

- So the question becomes how do you get a low skill floor and a high skill ceiling whilst also catering to a large number of people?

### Emergent Design as the Answer
- My solution comes mainly from emergent design. Not only can we get a low skill floor (because of the ideology of simple fundamental building blocks) and a moderately high skill ceiling, but we can also orient the direction of this scale. What do I mean? Maybe the software I'm writing would be amazingly powerful for a specific type of user with a specific use-case. But we want a variety of people to use it.

- In emergent complexity there are 2 concepts: the building block and the rules. Pretty self explanatory. Now to change the "direction" of the program all we have to do is slightly change the building block — and this, with the same rules, will allow for an incredibly high skill ceiling in a different direction. Want to appeal to researchers? Change the building blocks around that. Writers? Structure the blocks around prose. The rules should never have to change. If they do, you're building something new entirely.

### Flavors
- Because of the design framework we've built, we have the ability to have incredible input and output not just in one direction but in many. This is what I like to call having flavors of the program.

- Something I've always loved is researching stuff and finding what's right for me — trying to pick the perfect option. I think part of that just stems from wanting to get the most output out of something. So for the sake of the user, we provide different flavors — same rules, slightly different building blocks — to let them get the highest output in the direction they most closely align with.
