June 14th: 
1. Lot of work done today, duplication and templates is working great
2. However, lot of issues with asset and text transclusion still 
3. Next is selection pooling actions
4. After that, save state stuff and reliability
5. Then... implimentation of the akasha graph relationship constellation thing idk

June 15th:
1. lot of work very nice 
2. Honestly just little software quirks of ui and what not like commands being a little clunky that i will just have to fix over usage
3. finish text anchor stuff
4. constellation
5. data relia8ility nad saving 
6. auto installer and updates
7. make akasha overview and man pages while honing the little ui/command issues  
8. stresstest 24.4.1

There are 3 key aspects of akasha: content, space, and relationships. 
1. Content (Cell) is proven through the right pane where you edit. Its grounded in the content itself
2. Shomas bridge content and relationship through spatial arrangement in the left pane, this is the middle ground, the working ZUI.
3. Akasha is the birds eye view of the program depicting the overall relationships. This is depicted through the compass and the constellation:
	1. Compass Dock
		1. This shows the focused cell and a select number of its related cells determined off of this ranking
			1. - selected Cells
			- Cells visible in the current Shoma
			- Cells recently focused
			- Cells that are interrelated with other visible candidates
			- direct relationships over derived relationships
			- non-scratch / non-placeholder Cells
			- Cells with richer content over empty Cells
		2. ![[Pasted image 20260614181529.png]]
		3. This shows up as a tab in the bottom left still part of DOM 
	2. Constellation
		1. Abstractified cells only shown as dots. Same as above but it shows ALL related cells of focused and then draws the relationships they have with one another. 
			1. Similarish to obsidian graph 
		2. This shows up as a seperate window pixijs or webgl.

Now move to a new chatgpt chat and there only talk about the overall architecture things that we want to impliment dont actually implimen tthem instead take those architecture things and instructions and give them to codex to directly impliment

1. Finish constellation work
2. Ability to visually change core within a shoma so it will reshow all the cells and whether they are bound or whatever compared to it which is very expensive but also then when you declare bound or oreinted or whatever you have a new core within that shoma you are delcaring it within and so those relationships will stay even when the core retnrs back to the actual core adn the name of that cell type will also be recomputed. thhis is a gamechanger for enormous shoma layouts 
3. Make little demo and show vivaan 
4. Save safety
5. Auto installer 
6. Give to vivaan 
7. Make a manual whilst actually using it and slowly clearing up little ui and quirks 
8. Official Release!! in Beta
9. Vim mode added

Its not as polished as other apps but the value it brings makes it more powerful than all these others and after i impliment the bottom line reliability and data safety then it will make up for th elack of polish, a real b attle axe

compass looks so nice omg

June 15th:
1. Finishing line almost i got codex working and just fixing up ui stuff it looks great works great very nice 
2. However huge perfomrance issues iwth the canvas
	1. I really considered abandonign ship but nah no way. I think if perfomrance really cannot be solved then i will do a shoma tiling method just like teh cells are tiled the shoma could be tiled too. if even then its too laggy, we can make it so only one shoma is on screen at once
	2. Dw youre not getting off thateasy this project will live on 

give chat the project folder and tell it to write up md files in diretory style full documentation of code and all the functionality it has very dense and technical diferences between all the nuances of everything

This along with my handwritten preface of what akasha is and it can do and why i made it and how i used ai

write the handwritten preface and create a new main theem adn logo I have a nice logo and want a baskerville font for headings and jet brains mono or sm for body

1. check windows exe works
2. fonosh up windows
3. impliment manual update
4. daily use hardening
5. create manual and cocumentation and startup guide a little bit
6. Use for a few weeks 
7. Fix the issues and publish 
## Usage Notes
1. 