## Preface and Context
- This is an explanation of a project I'm currently working on.

- I've always bounced around from notetaking system to system. I always assumed it was because I just liked organization and trying new things but really, it was because everything was missing something. That's what I'm trying to solve by creating my own notetaking software. I doubt this would work for the majority of people but for me, this would serve as the most frictionless way to capture, ideate upon, and archive my ideas and thinking.

- It's hard to describe the way I like brainstorming and thinking naturally but I'll try. I think very much hierarchically but I also like drawing links between things and having many parent thoughts to one child thought. Its most akin to a hierarchical notetaking system combined with linking but on a note level. It's easy to describe these features but its another thing to design a program that would seamlessly combine these features into one fluid application. 

- In the process of attempting this, I naturally stumbled upon things that would make the program even better. 

## Intro
- Enough beating around the bush, I'll actually explain this program. What you need to first understand is that everything is a package of information. These packages can contain other packages too. You'll understand more as I continue. I should also note that this very abstract view of ideas can only be represented in a spatial, non linear form. ie I'm using a canvas/grid system to display the information.

## Relational Notetaking
- This program will utilize a relational notetaking system. What this means is that a package can have a relationship with another package as either a parent, child, or spouse. Nothing is limiting the number of parents or children or spouses a package can have.  
### Paradox
- I'm writing the program in such a way that it does not get in its own way. It allows these packages to function indepedently only tracking the relationship between it and another and not limiting the implciations of these relationships. To explain this, lemme elaborate. If x is the parent of y and y is the parent of c, there will be nothing in my program stopping c from being the parent of x.
## Nesting Doll Visualization
- By nature of these packages, you can effectively have a package (a) of a single word contain another package (b) of a hundred packages, one of those packages may be this package (a). I think you can start to see the paradoxical nature of this program. Everything is written in a way that does not get in it's own way and allows these paradoxes to form and skilled programming can facilitate these relationships to form. 
- Another very interesting thing that can come about from this visualization is the idea of having a singular library. This library is tons and tons of packages all displayed on the screen and you can click into any one package to see all of its packages and then another one to see all of its packages. This is meant to be recursive until you hit a package with no packages. 
    - I initially meant for this to have some kind of recursive rendering, rendering all of the sub packages whilst you view the larger package but because of the paradoxical nature of this system it will be incredibly resource-intensive and messy to impliment. It will also cause some issues because this is still after all grounded in some sense of a physical plane, meaning every package has to have some kind of location (I've thought of having relative locations and calculating absolute locations in the viewport at runtime but abandoned the idea). The calculations of where to place an item next to an item full of items will get very messy. 
        - The way I could bypass this on a programming level is I've implimented these relationship structs within every single package and required that for any child relationship struct, there must be a specified location of where in the parent. I can then have a size attribute required for any parent relationship. This size lays out the dimensions for the locations of hte children. I can impliment this into the program and also have some kind of downscaling that sizes down what's being rendered. 
        - If not for this, I would've just allowed the display of only 1 package and all its children at a time by default and to see the contents, you would have to unfold each child individually. 
## QOL/Implications
### Viewport
- I intend to split the viewport in two 65%, 35%. The majority should be the workspace where the user creates these relationships and lays out packages and arranges them. The other part should depict these relationships, it should be a display of the family tree of whatever package is clicked. Perhaps maybe there is some room for it to be something else. We shall see. 
### Spatial Notetaking 
- Since its a canvas/grid you can move around things. Not much to say here. Its kind of a byproduct and neccesity for the existance of the others. 

## Technicals
- I'm using C and raylib for this project because I need to be as close to metal as possible to ensure this is written as effeciently and with as much control as possible.

## Reflection
- The main limiting factor to this project, as is so common, is my own technical abilities as a programmer. However I'm confident in my ability to learn and improve where I fall short. Working in tandem with my refined ability to ideate, I'm certain I can execute this project.  
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
