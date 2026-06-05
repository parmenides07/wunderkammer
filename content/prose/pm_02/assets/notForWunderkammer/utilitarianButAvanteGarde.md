utilitarian but avant garde 
So i have thought of a visual look that is largely the same as what we had previously before we even implimented any visual changes with teh stark sharp borders which i want to keep because it adds character. sharp borders everywhere (just like before)! Starting from there we have a few things of note now: 

1. The background canvas is essentially an image you choose but there is a tracing paper effect on it. Essentially the way this works is The image gets gaussian blurred then a solid color layer is placed on top of it typically white with very low opacity. On top of that image, all the text and accent and everything it would be nice if they could be blurred a teeny bit to emulate bleed and then all the text and accent are put back on top of that layer, unblurred to mantain sharpness. So text and accents are two layers same thing one unblurred other blurred. And on top of the whole screen canavas and all there should be a subtle grain or noise.
	1. The user can choose the color of that solid layer and its opacity
	2. Maybe if possible we could have choice or no grid dotted grid or normal grid overlayed on this canvas image in color of accent with low opacity? not priority and i want you to impliment later because i want to ensure it looks right
2. The shoma should by default look clear but you can change it to make all the backgrounds of the cells either low opacity or have their own tracing paper effect compounding the one that is below (this one might be a bit much just have clear and low opacity for now)
3. For shoma too, you choose border radius with the default being 1 or 0 idk. You also choose the border color which is the accent color
	1. You can choose the cell/shoma border style, it can be 1 of 4 1. normal current 2. this is much more difficult and harder to describe yk when you are drawing lines by hand with a ruler and drawing a square but kinda overshoot the corner so it ends up ahving a bit extra on the coerners where the lines meet but continue going and then fade out kinda like how normal writing wokrs idk how youd implimen thtis THIS WOULD ONLY BE ON THE SHOMA for cells it is just normal here 3. only top left and bottom right corner is shown ykwim and the shoma and cells dont have a border 4. no borders anywhere
4. User can choose body font and heading font thats it. by default body font is used for both and for ui. They can also choose the font color
Also there is this really wierd annoying thing that keeps happening its like the border radiuses compound lets say it is 2px for selected cell and its on opne the edge of the shoma and shoma has 1 px then instead of just showing 2px on the edge it adds the 2px and 1 px definately not what is wanted.

focused cell always has larger drop shadow and this drop shadow should be the same color as the text color. this way on a black background when user sets text to white this drop shadow will still function and it will be a glow ykwim dont overthink or overengineer this. 
focused shoma has a larger drop shadow too

if borders are on focused cell and shoma have 1 px larger than the user defined border radius


Text and borders are on multiply
The current colors bars of structured or positioned and colored cells of relationships should only be shown when tab is held. 
Colors (it should be pretty much monochromatic in the non tabbed view) should be applied with overlay never solid blocks

another thing that would be nice. ALl the info at the top like the akashom prototype and all the commands it would be nice if you could just optionally hide that and then unhide it with a button press near the top or something idk how just treat it like a sidebar you can fold away.

Okay so I know i dumped a lot on you. This should   not be too difficult just css mainly so you got this. However some items are a bit difficult like the text being blurred then another layer of it not blurred or the corner overshoot effect a bunch of difficult things. So, if you have questions ask. Just impliment what is for sure you got and then give me that verison and ask me questions and I can answer then you can impliment those harder things wiht my answrs. Just to be clear impliment this on the version BEFOREwe made the visual changes and made the corners rounded and added drop shadows etc. 

I have uplodaded some of my inspirations for this look just so you could see where I am coming from DO NOT GET TOO SWAYED BY THE IMAGES go only off of the text i have given you but just look at these images for more context. 

Give me a full summary of what you added and didnt add. \


make it so the cell bg color is the same as the canvas blank and the solid color overlay on the image. the top tab of the shoma and tge top of the window w the commands and shomaq tabs should have an alternate bg coor this could also be used as the divider selector and move selection color essentialyl replacing that magenta. so there should be 4 main colors, 1 bg color altemrate bg color, text color and accent color. then also hte 4 colors used for central position placed, child parent spouse etc. See teh whole idea here should be reducing the amount of things I need to check and uncheck I think those are important and font and also some others like cell opacity and the tracing paper effect and focus width (why is there two there is focus border extra but also focus width) and a few others but a lot of them just add a lot of complexity try to reach a in between point between customiziability and complexity of values


in the future we gotta make it so that the shoma window header radius is the same as the cells and shoma currently it seems just a tad bit different im noit sure why. also, i hope at some point i can have border widths at non integer pixel rates. also later for the fonts i would like to impliment abiility to change weight and line spacing.

in the future we gotta make it so that the shoma window header radius is the same as the cells and shoma. also, i hope at some point i can have border widths at non integer pixel rates. also later for the fonts i would like to impliment abiility to change weight and line spacing. Can you also make it by default that the shoma tabs are bolded just like the shoma window headers are bolded do ykwim. When are we implimenting the next progression of the visuals so teh stuff we left off last time. I think its really important we add the bleeding or blurring of the lines becaus ei like the geometric look but the 1 px border conflicts hard with the blended and blurred and grainy rest of the image and text

HOW TO MAKE SQUARES LESS JARRING:
1. corner radius little bit (fix issue where it conflicts iwth the border width)
2. Slight blur on teh line itself so not as sharp ink bleed effect perchance
3. heavier drop shadow
4. perhaps a gap between cells but i think that looks tack
Look back at reference images on pinterest but these are coming out nice anyway

have temporary image system allows you to just drop in image in cell. 
get rid of the shoma window heaeder 
also the shoma border should be same as focused cell it looks wierd when focused cell is border radius 2 or sm but shoma the like top area of the shoma border is still 1px

### at some point
id like at some point that any added images automatically have that color overlayed with HSL color filter mode overlayed
Maybe the palete colors could be pulled from canvas image autaomtaically but that may be too much 


VARIABLE BORDER THICKNESS PLEASE NON INTEGER AMOPUNT PLEASE
have canvas irrelgularities and fading on geometry randomly (text and borders)
have interesting borders as seen below with their own roughness and iregularity

WE WANT IT TO SEEM LIKELIVING GRAPHIC DESIGN
![[Pasted image 20260602182535.png]]