So i have one idea with cells looking insane like literal cells. I have naother idea where its just simple css. But with that mutation and evolution is not really impactful

I think there is something powerful in having something that looks normal and unoffensive simple and then evolves to be insane depending on seed

i think if its just simple css then idk how random evolving would be cool oh big whoop the opacity decreased or its a different hue. More so, i think those initial css things could be the seeds and from there randomness occurs with teh shapes and looks of the cells and their movement and animation but that brings us back to the issue of the cell looks in the images being unfeasible. what do you think how can they be feasible and to what extent of those cells is possible and in what way?

the border is what makes up the cell so what if slowly, it becomes more nad more rounded and the border stops being so simple and becomes more alive and the cell starts moving more. and the mutastions cause interesting border characteristics. 
so that loko becomes different but also movement becomes differnet
simple line squares (which you customized) -> living blobs
static -> moving 

Wait the idea should be that the user stops the evolution once they're satisfied. Otherwise it will just keep adding rings infinitely 

- I'm certain the way to approach this is have a bunch of rings. The cell is a bunch of rings of specified size just arranged over and over and repeated. Imagine the construction of it like rings of a circle. Maybe some have noise in theme so it kinda wobbles? This can give the body a lot of intrigue too because its really those rings as well.
	- ![[Pasted image 20260528000935.png]]
	- ![[Pasted image 20260528001012.png]]
	- ![[Pasted image 20260528000452.png]]
	- 

Time Progression:
1. Make the square body smaller and smaller and more rounded  while the rings/border slowly start making up more and more of the cell (going from square to rounded or bubbly or spiky whatever the rings noise says) 

Random values of cell total 
1. Ring Count 
(of individual rings)
2. count
3. Ring spacing density
4. Ring contour
	1. The bottom of the ring should default to following the contour of the top of the ring below while the top of the current ring should default to same contour but bigger or be randomized with noise and become abnormal or spiky. 
5. Color Opacity (can be gradient as well)
6. Blur 
But how do we make the random look good? And how would the random work. For colors use same logic as pallete generators locking randomness of colors. 
For the border Thickness have big medium small if fully out of order, if in order: logarithmic, exponential, linear, constant. In order too have chance for modulation like sine wave so slight bumps of randomness within order 

The fitting of text will still be a bit difficult 
Performance may be fried but just track ints of deviation from original.  or something else elegant. also maybe or def not animation oly animation should be on movement or splitting or placing??
- No cosntant oscillation or movement or cursor interaction. 
- Add some w sound effects too !


LOWK FADE BELOW: I have adopted the above ring model

Time Progression:
1. Square -> Abnormal (Spiked, Rounded, Randomly Bubbly)

Random: (Focus less on making a whole new cell but more so modifying the existing cell border and body)
1. Size 
2. Distance / Squash
3. Border Style
	1. Lot to this but i think it should be comprised of a bunch of tiny borders either it should be dark light dark to make it seem like a 3d thing or like 
	2. ![[Pasted image 20260528000020.png]]
	3. ![[Pasted image 20260528000418.png]]
	4. ![[Pasted image 20260528000501.png]]
	5. ![[Pasted image 20260528000826.png]]
	6. ![[Pasted image 20260528000838.png]]
4. Body Style
	1. Decent Amount to This
	2. ![[Pasted image 20260527235604.png]]
	3. ![[Pasted image 20260528000056.png]]
5. Texture (Noise, Graininess, Pixelated)